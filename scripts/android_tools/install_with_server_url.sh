#!/bin/bash

set -euo pipefail

MODE_OR_VALUE="${1:-emulator}"

if [ "$MODE_OR_VALUE" = "emulator" ]; then
  SMARTWARDROBE_SERVER_URL="http://10.0.2.2:8080/index.html"
elif [[ "$MODE_OR_VALUE" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  SMARTWARDROBE_SERVER_URL="http://$MODE_OR_VALUE:8080/index.html"
else
  SMARTWARDROBE_SERVER_URL="$MODE_OR_VALUE"
fi

export SMARTWARDROBE_SERVER_URL

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/install_app.sh"
