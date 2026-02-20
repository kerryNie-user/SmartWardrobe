#!/bin/bash

# Define colors
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PACKAGE_NAME="com.example.smartwardrobe"

# Check for connected devices
DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "No devices connected."
    exit 1
fi

# If multiple devices, pick the first one (or could add selection logic)
DEVICE=$(adb devices | grep -w "device" | head -n 1 | awk '{print $1}')

echo -e "${YELLOW}Streaming logs for $PACKAGE_NAME on device $DEVICE...${NC}"
echo "Press Ctrl+C to stop."

# Clear old logs
adb -s "$DEVICE" logcat -c

# Filter logs by package name (using grep as older adb versions don't support --pid filtering well directly)
# Getting PID first
PID=$(adb -s "$DEVICE" shell pidof -s "$PACKAGE_NAME")

if [ -z "$PID" ]; then
    echo "App is not running. Waiting for process..."
    adb -s "$DEVICE" logcat | grep "$PACKAGE_NAME"
else
    echo "Process ID: $PID"
    adb -s "$DEVICE" logcat --pid="$PID" *:D
fi
