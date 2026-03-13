#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

ensure_runtime_dirs
cleanup_stale_pid_files

stop_pid() {
  local label="$1"
  local pid_file="$2"
  local pid
  pid="$(read_pid_file "${pid_file}")"

  if [[ -z "${pid}" ]]; then
    return 0
  fi

  if ! is_pid_running "${pid}"; then
    clear_pid_file "${pid_file}"
    return 0
  fi

  print_info "Stopping ${label} (PID ${pid})..."
  kill "${pid}" >/dev/null 2>&1 || true

  local attempt
  for attempt in {1..10}; do
    if ! is_pid_running "${pid}"; then
      clear_pid_file "${pid_file}"
      print_success "${label} stopped."
      return 0
    fi
    sleep 1
  done

  print_warning "${label} did not exit gracefully; sending SIGKILL."
  kill -9 "${pid}" >/dev/null 2>&1 || true
  clear_pid_file "${pid_file}"
}

launcher_pid="$(read_pid_file "${LAUNCHER_PID_FILE}")"
backend_pid="$(read_pid_file "${BACKEND_PID_FILE}")"
frontend_pid="$(read_pid_file "${FRONTEND_PID_FILE}")"
share_pid="$(read_pid_file "${SHARE_PID_FILE}")"

if [[ -z "${launcher_pid}" && -z "${backend_pid}" && -z "${frontend_pid}" && -z "${share_pid}" ]]; then
  print_info "No managed launcher processes are running."
  exit 0
fi

stop_pid "share" "${SHARE_PID_FILE}"
stop_pid "launcher" "${LAUNCHER_PID_FILE}"
stop_pid "frontend" "${FRONTEND_PID_FILE}"
stop_pid "backend" "${BACKEND_PID_FILE}"
rm -f "${SHARE_URL_FILE}"

print_success "Stop sequence completed."
