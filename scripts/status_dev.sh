#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

ensure_runtime_dirs
cleanup_stale_pid_files

report_process() {
  local label="$1"
  local pid_file="$2"
  local pid
  pid="$(read_pid_file "${pid_file}")"

  if [[ -n "${pid}" ]] && is_pid_running "${pid}"; then
    printf "%s: running (pid=%s)\n" "${label}" "${pid}"
  else
    printf "%s: stopped\n" "${label}"
  fi
}

report_process "launcher" "${LAUNCHER_PID_FILE}"
report_process "backend" "${BACKEND_PID_FILE}"
report_process "frontend" "${FRONTEND_PID_FILE}"

if port_in_use "${BACKEND_PORT}"; then
  print_info "backend port ${BACKEND_PORT} is listening"
else
  print_warning "backend port ${BACKEND_PORT} is not listening"
fi

if port_in_use "${FRONTEND_PORT}"; then
  print_info "frontend port ${FRONTEND_PORT} is listening"
else
  print_warning "frontend port ${FRONTEND_PORT} is not listening"
fi

print_info "Backend log: ${BACKEND_LOG}"
print_info "Frontend log: ${FRONTEND_LOG}"
