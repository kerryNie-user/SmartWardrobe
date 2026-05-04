#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

export BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
export BACKEND_PORT="${BACKEND_PORT:-8140}"
export BACKEND_WEB_ROOT="${BACKEND_WEB_ROOT:-${PROJECT_ROOT}/apps/web}"
export BACKEND_DATA_FILE="${BACKEND_DATA_FILE:-${PROJECT_ROOT}/services/backend/data/db.json}"

WITH_AI_WORKER=0
for arg in "$@"; do
  case "${arg}" in
    --with-ai-worker)
      WITH_AI_WORKER=1
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      echo "Usage: $0 [--with-ai-worker]" >&2
      exit 2
      ;;
  esac
done

if [[ "${WITH_AI_WORKER}" == "1" ]]; then
  sh scripts/dev/start_ai_blogger_worker.sh &
  WORKER_PID="$!"

  cleanup() {
    kill "${WORKER_PID}" >/dev/null 2>&1 || true
  }

  trap cleanup EXIT INT TERM
fi

PYTHON_BIN="${PYTHON_BIN:-python3}"
"${PYTHON_BIN}" -m services.backend.server
