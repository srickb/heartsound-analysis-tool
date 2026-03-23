#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

TUNNEL_BIN_DIR="${RUNTIME_DIR}/bin"

copy_share_url_to_clipboard() {
  local url="$1"
  if [[ -z "${url}" ]]; then
    return 0
  fi

  if command_exists pbcopy; then
    printf "%s" "${url}" | pbcopy
    print_info "Public URL copied to clipboard."
  fi
}

download_file() {
  local url="$1"
  local destination="$2"

  if command_exists curl; then
    curl -fsSL "${url}" -o "${destination}"
    return 0
  fi

  local python_bin
  python_bin="$(resolve_backend_python || true)"
  if [[ -n "${python_bin}" ]]; then
    "${python_bin}" -c "import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])" "${url}" "${destination}"
    return 0
  fi

  return 1
}

resolve_cloudflared() {
  if [[ -n "${SHARE_TUNNEL_BIN:-}" && -x "${SHARE_TUNNEL_BIN}" ]]; then
    printf "%s\n" "${SHARE_TUNNEL_BIN}"
    return 0
  fi

  if command_exists cloudflared; then
    command -v cloudflared
    return 0
  fi

  local cached_bin="${TUNNEL_BIN_DIR}/cloudflared"
  if [[ -x "${cached_bin}" ]]; then
    printf "%s\n" "${cached_bin}"
    return 0
  fi

  local os_name
  local arch_name
  local asset_name
  os_name="$(uname -s)"
  arch_name="$(uname -m)"

  case "${os_name}:${arch_name}" in
    Darwin:arm64)
      asset_name="cloudflared-darwin-arm64.tgz"
      ;;
    Darwin:x86_64)
      asset_name="cloudflared-darwin-amd64.tgz"
      ;;
    Linux:x86_64)
      asset_name="cloudflared-linux-amd64"
      ;;
    Linux:aarch64|Linux:arm64)
      asset_name="cloudflared-linux-arm64"
      ;;
    *)
      print_error "unsupported platform for automatic cloudflared download: ${os_name} ${arch_name}"
      return 1
      ;;
  esac

  mkdir -p "${TUNNEL_BIN_DIR}"

  local download_url="https://github.com/cloudflare/cloudflared/releases/latest/download/${asset_name}"
  local temp_file="${TUNNEL_BIN_DIR}/${asset_name}"

  print_info "Downloading cloudflared tunnel helper..." >&2
  if ! download_file "${download_url}" "${temp_file}"; then
    print_error "failed to download cloudflared from ${download_url}"
    return 1
  fi

  if [[ "${asset_name}" == *.tgz ]]; then
    tar -xzf "${temp_file}" -C "${TUNNEL_BIN_DIR}"
    rm -f "${temp_file}"
  else
    mv "${temp_file}" "${cached_bin}"
  fi

  chmod +x "${cached_bin}"
  printf "%s\n" "${cached_bin}"
}

ensure_project_layout
ensure_runtime_dirs
cleanup_stale_pid_files

if ! port_in_use "${FRONTEND_PORT}"; then
  print_error "frontend is not running on port ${FRONTEND_PORT}"
  print_info "Start the project first with ./bin/start"
  exit 1
fi

SHARE_PYTHON_BIN="$(resolve_backend_python || true)"
if [[ -z "${SHARE_PYTHON_BIN}" ]]; then
  print_error "Python executable not found. It is required to launch the share tunnel as a detached process."
  exit 1
fi

TUNNEL_BIN="$(resolve_cloudflared || true)"
if [[ -z "${TUNNEL_BIN}" ]]; then
  print_error "cloudflared is not available and could not be prepared automatically."
  exit 1
fi

existing_share_pid="$(read_pid_file "${SHARE_PID_FILE}")"
if [[ -n "${existing_share_pid}" ]] && is_pid_running "${existing_share_pid}"; then
  print_info "share tunnel is already running (PID ${existing_share_pid})"
  if [[ -f "${SHARE_URL_FILE}" ]]; then
    existing_share_url="$(cat "${SHARE_URL_FILE}")"
    print_success "Public URL: ${existing_share_url}"
    copy_share_url_to_clipboard "${existing_share_url}"
  else
    print_warning "Share URL is still starting. Check ${SHARE_LOG}"
  fi
  exit 0
fi

: > "${SHARE_LOG}"
rm -f "${SHARE_URL_FILE}"

print_info "Opening a public share URL for http://127.0.0.1:${FRONTEND_PORT} ..."
share_pid="$(
  cd "${ROOT_DIR}"
  "${SHARE_PYTHON_BIN}" -c '
import subprocess
import sys

log_handle = open(sys.argv[1], "ab", buffering=0)
process = subprocess.Popen(
    sys.argv[2:],
    stdin=subprocess.DEVNULL,
    stdout=log_handle,
    stderr=subprocess.STDOUT,
    start_new_session=True,
)
print(process.pid)
' "${SHARE_LOG}" "${TUNNEL_BIN}" tunnel --url "http://127.0.0.1:${FRONTEND_PORT}" --no-autoupdate
)"
write_pid_file "${SHARE_PID_FILE}" "${share_pid}"

share_url=""
for _ in {1..30}; do
  if ! is_pid_running "${share_pid}"; then
    print_error "share tunnel exited before a public URL was created"
    show_log_tail "share" "${SHARE_LOG}"
    clear_pid_file "${SHARE_PID_FILE}"
    exit 1
  fi

  share_url="$(grep -Eo 'https://[[:alnum:]-]+\.trycloudflare\.com' "${SHARE_LOG}" | tail -n 1 || true)"
  if [[ -n "${share_url}" ]]; then
    printf "%s\n" "${share_url}" > "${SHARE_URL_FILE}"
    print_success "Public URL: ${share_url}"
    copy_share_url_to_clipboard "${share_url}"
    print_info "Anyone with this URL can open the site from another network while this share tunnel stays running."
    print_info "If access mode is code, also run ./bin/code and share the 5-minute numeric code."
    exit 0
  fi

  sleep 1
done

print_error "timed out while waiting for the public share URL"
show_log_tail "share" "${SHARE_LOG}"
clear_pid_file "${SHARE_PID_FILE}"
exit 1
