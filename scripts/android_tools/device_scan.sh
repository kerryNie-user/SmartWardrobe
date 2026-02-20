#!/bin/bash

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Scanning for connected Android devices...${NC}"

# Check if adb is installed
if ! command -v adb &> /dev/null; then
    echo "Error: adb command not found. Please install Android SDK Platform-Tools."
    exit 1
fi

# Get device list
DEVICES=$(adb devices -l | grep -w "device")

if [ -z "$DEVICES" ]; then
    echo "No devices connected."
    exit 0
fi

echo -e "${GREEN}Connected Devices:${NC}"
echo "----------------------------------------"

# Parse and display device info
IFS=$'\n'
for LINE in $DEVICES; do
    # Extract Serial
    SERIAL=$(echo "$LINE" | awk '{print $1}')
    
    # Extract Model
    MODEL=$(echo "$LINE" | grep -o 'model:[^ ]*' | cut -d: -f2)
    
    # Extract Product
    PRODUCT=$(echo "$LINE" | grep -o 'product:[^ ]*' | cut -d: -f2)
    
    # Get Android Version (requires shell access)
    VERSION=$(adb -s "$SERIAL" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
    SDK=$(adb -s "$SERIAL" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r')
    BATTERY=$(adb -s "$SERIAL" shell dumpsys battery | grep "level" | awk '{print $2}' 2>/dev/null)

    echo -e "Device ID: ${GREEN}$SERIAL${NC}"
    echo "  Model:   $MODEL ($PRODUCT)"
    echo "  Android: $VERSION (SDK $SDK)"
    if [ ! -z "$BATTERY" ]; then
        echo "  Battery: $BATTERY%"
    fi
    echo "----------------------------------------"
done
unset IFS
