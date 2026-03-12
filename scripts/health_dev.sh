#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

backend_url="http://127.0.0.1:${BACKEND_PORT}${BACKEND_HEALTH_PATH}"
frontend_url="http://127.0.0.1:${FRONTEND_PORT}${FRONTEND_HEALTH_PATH}"

backend_status="down"
frontend_status="down"

if http_ok "${backend_url}"; then
  backend_status="up"
fi

if http_ok "${frontend_url}"; then
  frontend_status="up"
fi

printf "backend=%s url=%s\n" "${backend_status}" "${backend_url}"
printf "frontend=%s url=%s\n" "${frontend_status}" "${frontend_url}"

if [[ "${backend_status}" != "up" || "${frontend_status}" != "up" ]]; then
  exit 1
fi
