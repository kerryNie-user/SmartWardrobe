#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

export MYSQL_USER="${MYSQL_USER:-root}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-Lovekerry2006)}"
export MYSQL_DB="${MYSQL_DB:-i18n_test}"

python3 <<EOF
from services.backend_legacy.server import main
main()
EOF
