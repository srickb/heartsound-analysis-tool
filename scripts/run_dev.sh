#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

TAIL_BACKEND_PID=""
TAIL_FRONTEND_PID=""
BACKEND_PID=""
FRONTEND_PID=""
SHARE_PID=""
STOPPING=0

cleanup() {
  local exit_code="${1:-0}"

  if [[ "${TAIL_BACKEND_PID}" =~ ^[0-9]+$ ]]; then
    kill "${TAIL_BACKEND_PID}" >/dev/null 2>&1 || true
  fi
  if [[ "${TAIL_FRONTEND_PID}" =~ ^[0-9]+$ ]]; then
    kill "${TAIL_FRONTEND_PID}" >/dev/null 2>&1 || true
  fi

  if [[ "${STOPPING}" -eq 0 ]]; then
    STOPPING=1
    SHARE_PID="$(read_pid_file "${SHARE_PID_FILE}")"
    if [[ -n "${SHARE_PID}" ]] && is_pid_running "${SHARE_PID}"; then
      kill "${SHARE_PID}" >/dev/null 2>&1 || true
    fi
    if [[ -n "${FRONTEND_PID}" ]] && is_pid_running "${FRONTEND_PID}"; then
      kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
    fi
    if [[ -n "${BACKEND_PID}" ]] && is_pid_running "${BACKEND_PID}"; then
      kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    fi
  fi

  local pid
  for pid in "${FRONTEND_PID}" "${BACKEND_PID}"; do
    if [[ -n "${pid}" ]] && is_pid_running "${pid}"; then
      wait "${pid}" 2>/dev/null || true
    fi
  done

  clear_pid_file "${BACKEND_PID_FILE}"
  clear_pid_file "${FRONTEND_PID_FILE}"
  clear_pid_file "${LAUNCHER_PID_FILE}"
  clear_pid_file "${SHARE_PID_FILE}"
  rm -f "${SHARE_URL_FILE}"

  return "${exit_code}"
}

on_signal() {
  print_info "Stopping launcher and child processes..."
  cleanup 0
  exit 0
}

trap on_signal INT TERM

ensure_project_layout
ensure_runtime_dirs
cleanup_stale_pid_files

existing_launcher_pid="$(read_pid_file "${LAUNCHER_PID_FILE}")"
if [[ -n "${existing_launcher_pid}" ]] && is_pid_running "${existing_launcher_pid}"; then
  print_error "launcher is already running with PID ${existing_launcher_pid}"
  print_info "Use ./bin/stop_dev.sh first if you want to restart it."
  exit 1
fi

if port_in_use "${BACKEND_PORT}"; then
  print_error "backend port ${BACKEND_PORT} is already in use"
  describe_port_usage "${BACKEND_PORT}"
  exit 1
fi

if port_in_use "${FRONTEND_PORT}"; then
  print_error "frontend port ${FRONTEND_PORT} is already in use"
  describe_port_usage "${FRONTEND_PORT}"
  exit 1
fi

BACKEND_PYTHON_BIN="$(resolve_backend_python || true)"
if [[ -z "${BACKEND_PYTHON_BIN}" ]]; then
  print_error "Python executable not found. Install Python 3 or set BACKEND_PYTHON in launcher.env."
  exit 1
fi

FRONTEND_NPM_BIN="$(resolve_frontend_npm || true)"
if [[ -z "${FRONTEND_NPM_BIN}" ]]; then
  print_error "npm was not found. Install Node.js/npm or set FRONTEND_NPM in launcher.env."
  exit 1
fi

if ! check_backend_dependencies "${BACKEND_PYTHON_BIN}"; then
  print_error "backend dependencies are missing for ${BACKEND_PYTHON_BIN}"
  print_info "Run: cd backend && ${BACKEND_PYTHON_BIN} -m pip install -r requirements.txt"
  exit 1
fi

if ! check_frontend_dependencies; then
  print_error "frontend dependencies are missing at ${FRONTEND_DIR}/node_modules"
  print_info "Run: cd frontend && ${FRONTEND_NPM_BIN} install"
  exit 1
fi

: > "${BACKEND_LOG}"
: > "${FRONTEND_LOG}"
: > "${LAUNCHER_LOG}"
write_pid_file "${LAUNCHER_PID_FILE}" "$$"

print_info "Project root: ${ROOT_DIR}" | tee -a "${LAUNCHER_LOG}"
print_info "Backend Python: ${BACKEND_PYTHON_BIN}" | tee -a "${LAUNCHER_LOG}"
print_info "Frontend npm: ${FRONTEND_NPM_BIN}" | tee -a "${LAUNCHER_LOG}"

print_info "Starting backend on http://127.0.0.1:${BACKEND_PORT}" | tee -a "${LAUNCHER_LOG}"
(
  cd "${BACKEND_DIR}"
  exec "${BACKEND_PYTHON_BIN}" -m uvicorn app.main:app --reload --host "${BACKEND_HOST}" --port "${BACKEND_PORT}"
) >> "${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!
write_pid_file "${BACKEND_PID_FILE}" "${BACKEND_PID}"

if ! wait_for_http_ready "backend" "http://127.0.0.1:${BACKEND_PORT}${BACKEND_HEALTH_PATH}" "${BACKEND_PID}" 30 1; then
  print_error "backend failed to start correctly"
  show_log_tail "backend" "${BACKEND_LOG}"
  cleanup 1
  exit 1
fi
print_success "Backend is ready." | tee -a "${LAUNCHER_LOG}"

print_info "Starting frontend on http://127.0.0.1:${FRONTEND_PORT}" | tee -a "${LAUNCHER_LOG}"
(
  cd "${FRONTEND_DIR}"
  exec "${FRONTEND_NPM_BIN}" run dev -- --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}"
) >> "${FRONTEND_LOG}" 2>&1 &
FRONTEND_PID=$!
write_pid_file "${FRONTEND_PID_FILE}" "${FRONTEND_PID}"

if ! wait_for_http_ready "frontend" "http://127.0.0.1:${FRONTEND_PORT}${FRONTEND_HEALTH_PATH}" "${FRONTEND_PID}" 30 1; then
  print_error "frontend failed to start correctly"
  show_log_tail "frontend" "${FRONTEND_LOG}"
  cleanup 1
  exit 1
fi
print_success "Frontend is ready." | tee -a "${LAUNCHER_LOG}"

tail -n 20 -F "${BACKEND_LOG}" | sed -u 's/^/[backend] /' &
TAIL_BACKEND_PID=$!
tail -n 20 -F "${FRONTEND_LOG}" | sed -u 's/^/[frontend] /' &
TAIL_FRONTEND_PID=$!

print_success "Launcher started successfully."
print_info "Frontend: http://127.0.0.1:${FRONTEND_PORT}"
print_info "Backend:  http://127.0.0.1:${BACKEND_PORT}"
print_info "Press Ctrl+C to stop both services, or run ./bin/stop_dev.sh from another terminal."

while true; do
  if ! is_pid_running "${BACKEND_PID}"; then
    print_error "backend process exited unexpectedly"
    show_log_tail "backend" "${BACKEND_LOG}"
    cleanup 1
    exit 1
  fi

  if ! is_pid_running "${FRONTEND_PID}"; then
    print_error "frontend process exited unexpectedly"
    show_log_tail "frontend" "${FRONTEND_LOG}"
    cleanup 1
    exit 1
  fi

  sleep 1
done
