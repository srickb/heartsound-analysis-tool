#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

ensure_project_layout
ensure_runtime_dirs
cleanup_stale_pid_files

BACKEND_PYTHON_BIN="$(resolve_backend_python || true)"
if [[ -z "${BACKEND_PYTHON_BIN}" ]]; then
  print_error "Python executable not found. Install Python 3 or set BACKEND_PYTHON in launcher.env."
  exit 1
fi

if ! check_backend_dependencies "${BACKEND_PYTHON_BIN}"; then
  print_error "backend dependencies are missing for ${BACKEND_PYTHON_BIN}"
  print_info "Run: cd backend && ${BACKEND_PYTHON_BIN} -m pip install -r requirements.txt"
  exit 1
fi

launcher_pid="$(read_pid_file "${LAUNCHER_PID_FILE}")"
if [[ -z "${launcher_pid}" ]] || ! is_pid_running "${launcher_pid}"; then
  print_warning "launcher is not running right now. The code will still be generated, but users cannot log in until ./start is running."
fi

print_info "Generating a new 5-minute numeric access code..."

(
  cd "${BACKEND_DIR}"
  exec "${BACKEND_PYTHON_BIN}" - <<'PY'
from app.db import init_db
from app.services.auth_service import generate_access_code, update_access_mode

init_db()
update_access_mode("code")
result = generate_access_code()
print(f"Access mode set to: code")
print(f"Access code expires at: {result['expiresAt']}")
PY
)

print_success "A one-time access code was generated on this machine."
print_info "Users can now open the site and enter that code on the login screen."
