#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

export LITE_BACKEND_DATA_FILE="${LITE_BACKEND_DATA_FILE:-${PROJECT_ROOT}/services/backend_lite/data/db.json}"
export SQLITE_DB="${SQLITE_DB:-$(dirname "$LITE_BACKEND_DATA_FILE")/smartwardrobe_lite.db}"

export AI_BLOGGER_BOOTSTRAP_COUNT="${AI_BLOGGER_BOOTSTRAP_COUNT:-1}"
export AI_BLOGGER_INTERVAL_SECONDS="${AI_BLOGGER_INTERVAL_SECONDS:-31536000}"
export AI_BLOGGER_LOCALES="${AI_BLOGGER_LOCALES:-zh-CN,en-US}"
export AI_BLOGGER_LLM_MODE="${AI_BLOGGER_LLM_MODE:-real}"
export AI_BLOGGER_DOWNLOAD_IMAGES="${AI_BLOGGER_DOWNLOAD_IMAGES:-true}"

python3 -m services.ai_blogger.worker.scheduler

