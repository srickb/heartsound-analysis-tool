#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"

set +e
./start
EXIT_CODE=$?
set -e

if [[ "${EXIT_CODE}" -ne 0 ]]; then
  echo
  read -r -p "Launcher exited with code ${EXIT_CODE}. Press Enter to close..." _
fi

exit "${EXIT_CODE}"
