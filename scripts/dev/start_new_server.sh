#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

if [ -f "${PROJECT_ROOT}/.env.local" ]; then
  set -a
  source "${PROJECT_ROOT}/.env.local"
  set +a
fi

export PORT="${PORT:-8080}"
export WEBAPP_DIR="${WEBAPP_DIR:-apps/web-new}"
export AUTO_START_DB="${AUTO_START_DB:-true}"
export INIT_I18N_DB="${INIT_I18N_DB:-true}"
export MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
export MYSQL_PORT="${MYSQL_PORT:-3306}"
export MYSQL_USER="${MYSQL_USER:-root}"
export MYSQL_DB="${MYSQL_DB:-i18n_test}"

python3 <<EOF
from services.backend_legacy.server import main
main()
EOF
