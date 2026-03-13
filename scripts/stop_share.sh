#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

ensure_runtime_dirs
cleanup_stale_pid_files

share_pid="$(read_pid_file "${SHARE_PID_FILE}")"
if [[ -z "${share_pid}" ]]; then
  print_info "No share tunnel is running."
  exit 0
fi

if ! is_pid_running "${share_pid}"; then
  clear_pid_file "${SHARE_PID_FILE}"
  rm -f "${SHARE_URL_FILE}"
  print_info "No share tunnel is running."
  exit 0
fi

print_info "Stopping share tunnel (PID ${share_pid})..."
kill "${share_pid}" >/dev/null 2>&1 || true

for _ in {1..10}; do
  if ! is_pid_running "${share_pid}"; then
    clear_pid_file "${SHARE_PID_FILE}"
    rm -f "${SHARE_URL_FILE}"
    print_success "Share tunnel stopped."
    exit 0
  fi
  sleep 1
done

print_warning "Share tunnel did not exit gracefully; sending SIGKILL."
kill -9 "${share_pid}" >/dev/null 2>&1 || true
clear_pid_file "${SHARE_PID_FILE}"
rm -f "${SHARE_URL_FILE}"
print_success "Share tunnel stopped."
