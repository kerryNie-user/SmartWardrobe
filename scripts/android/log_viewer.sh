#!/bin/bash

# Define colors
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PACKAGE_NAME="com.example.smartwardrobe"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_adb_utils.sh"

if ! adb_ensure_available; then
    echo "Error: adb command not found. Please install Android SDK Platform-Tools."
    exit 1
fi

DEVICE_COUNT=$(adb_list_devices | wc -l)

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "No devices connected."
    exit 1
fi

DEVICE="$(adb_pick_device)"

echo -e "${YELLOW}Streaming logs for $PACKAGE_NAME on device $DEVICE...${NC}"
echo "Press Ctrl+C to stop."

# Clear old logs
"${ADB_BIN}" -s "$DEVICE" logcat -c

# Filter logs by package name (using grep as older adb versions don't support --pid filtering well directly)
# Getting PID first
PID=$("${ADB_BIN}" -s "$DEVICE" shell pidof -s "$PACKAGE_NAME")

if [ -z "$PID" ]; then
    echo "App is not running. Waiting for process..."
    "${ADB_BIN}" -s "$DEVICE" logcat | grep "$PACKAGE_NAME"
else
    echo "Process ID: $PID"
    "${ADB_BIN}" -s "$DEVICE" logcat --pid="$PID" *:D
fi
