#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

if [[ -f "${ROOT_DIR}/launcher.env" ]]; then
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/launcher.env"
fi

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_HEALTH_PATH="${BACKEND_HEALTH_PATH:-/api/health}"
FRONTEND_HEALTH_PATH="${FRONTEND_HEALTH_PATH:-/}"

RUNTIME_DIR="${RUNTIME_DIR:-${ROOT_DIR}/.launcher}"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"

BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"
LAUNCHER_LOG="${LOG_DIR}/launcher.log"

BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
LAUNCHER_PID_FILE="${PID_DIR}/launcher.pid"

if [[ -t 1 ]]; then
  COLOR_BLUE="$(printf '\033[1;34m')"
  COLOR_GREEN="$(printf '\033[1;32m')"
  COLOR_YELLOW="$(printf '\033[1;33m')"
  COLOR_RED="$(printf '\033[1;31m')"
  COLOR_RESET="$(printf '\033[0m')"
else
  COLOR_BLUE=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
  COLOR_RESET=""
fi

print_info() {
  printf "%s[INFO]%s %s\n" "${COLOR_BLUE}" "${COLOR_RESET}" "$*"
}

print_success() {
  printf "%s[OK]%s %s\n" "${COLOR_GREEN}" "${COLOR_RESET}" "$*"
}

print_warning() {
  printf "%s[WARN]%s %s\n" "${COLOR_YELLOW}" "${COLOR_RESET}" "$*"
}

print_error() {
  printf "%s[ERROR]%s %s\n" "${COLOR_RED}" "${COLOR_RESET}" "$*" >&2
}

ensure_project_layout() {
  if [[ ! -f "${BACKEND_DIR}/app/main.py" ]]; then
    print_error "backend entrypoint not found at ${BACKEND_DIR}/app/main.py"
    return 1
  fi

  if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
    print_error "frontend package.json not found at ${FRONTEND_DIR}/package.json"
    return 1
  fi
}

ensure_runtime_dirs() {
  mkdir -p "${LOG_DIR}" "${PID_DIR}"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

read_pid_file() {
  local pid_file="$1"
  if [[ -f "${pid_file}" ]]; then
    tr -d '[:space:]' < "${pid_file}"
  fi
}

is_pid_running() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1
}

write_pid_file() {
  local pid_file="$1"
  local pid="$2"
  printf "%s\n" "${pid}" > "${pid_file}"
}

clear_pid_file() {
  local pid_file="$1"
  rm -f "${pid_file}"
}

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

describe_port_usage() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

resolve_backend_python() {
  if [[ -n "${BACKEND_PYTHON:-}" && -x "${BACKEND_PYTHON}" ]]; then
    printf "%s\n" "${BACKEND_PYTHON}"
    return 0
  fi

  if [[ -x "${BACKEND_DIR}/.venv/bin/python" ]]; then
    printf "%s\n" "${BACKEND_DIR}/.venv/bin/python"
    return 0
  fi

  if [[ -x "${BACKEND_DIR}/venv/bin/python" ]]; then
    printf "%s\n" "${BACKEND_DIR}/venv/bin/python"
    return 0
  fi

  if command_exists python3; then
    command -v python3
    return 0
  fi

  if command_exists python; then
    command -v python
    return 0
  fi

  return 1
}

resolve_frontend_npm() {
  if [[ -n "${FRONTEND_NPM:-}" && -x "${FRONTEND_NPM}" ]]; then
    printf "%s\n" "${FRONTEND_NPM}"
    return 0
  fi

  if command_exists npm; then
    command -v npm
    return 0
  fi

  return 1
}

check_backend_dependencies() {
  local python_bin="$1"
  "${python_bin}" -c "import fastapi, uvicorn, pandas, openpyxl, multipart" >/dev/null 2>&1
}

check_frontend_dependencies() {
  [[ -d "${FRONTEND_DIR}/node_modules" ]]
}

http_ok() {
  local url="$1"

  if command_exists curl; then
    curl -fsS --max-time 2 "${url}" >/dev/null 2>&1
    return $?
  fi

  local python_bin
  python_bin="$(resolve_backend_python 2>/dev/null || true)"
  if [[ -z "${python_bin}" ]]; then
    return 1
  fi

  "${python_bin}" -c "import sys, urllib.request; urllib.request.urlopen(sys.argv[1], timeout=2)" "${url}" >/dev/null 2>&1
}

wait_for_http_ready() {
  local label="$1"
  local url="$2"
  local pid="$3"
  local attempts="${4:-30}"
  local delay="${5:-1}"

  local attempt
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if ! is_pid_running "${pid}"; then
      return 1
    fi
    if http_ok "${url}"; then
      return 0
    fi
    sleep "${delay}"
  done

  print_warning "${label} did not become ready at ${url} within ${attempts}s"
  return 1
}

show_log_tail() {
  local label="$1"
  local log_file="$2"
  if [[ -f "${log_file}" ]]; then
    print_info "Last ${label} log lines:"
    tail -n 20 "${log_file}" | sed "s/^/[${label}] /"
  else
    print_warning "No log file found for ${label}: ${log_file}"
  fi
}

cleanup_stale_pid_files() {
  local pid
  for pid_file in "${BACKEND_PID_FILE}" "${FRONTEND_PID_FILE}" "${LAUNCHER_PID_FILE}"; do
    pid="$(read_pid_file "${pid_file}")"
    if [[ -n "${pid}" ]] && ! is_pid_running "${pid}"; then
      clear_pid_file "${pid_file}"
    fi
  done
}
