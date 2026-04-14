#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

export LITE_BACKEND_HOST="${LITE_BACKEND_HOST:-127.0.0.1}"
export LITE_BACKEND_PORT="${LITE_BACKEND_PORT:-8140}"
export LITE_BACKEND_WEB_ROOT="${LITE_BACKEND_WEB_ROOT:-${PROJECT_ROOT}/apps/web-new}"
export LITE_BACKEND_DATA_FILE="${LITE_BACKEND_DATA_FILE:-${PROJECT_ROOT}/services/backend_lite/data/db.json}"

python3 <<EOF
from services.backend_lite.server import main
main()
EOF
