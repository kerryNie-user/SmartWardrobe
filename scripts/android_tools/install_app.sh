#!/bin/bash

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="../../App/AndroidApp"
GRADLEW="./gradlew"
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
PACKAGE_NAME="com.example.smartwardrobe"

echo -e "${YELLOW}Starting SmartWardrobe App Installation Process...${NC}"

# Check for connected devices
echo -e "${YELLOW}Scanning for connected Android devices...${NC}"
DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)
DEVICE_COUNT=$((DEVICE_COUNT)) # Trim whitespace

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo -e "${RED}Error: No connected Android devices found.${NC}"
    echo "Please connect a device via USB or start an emulator."
    exit 1
fi

echo -e "${GREEN}Found $DEVICE_COUNT device(s).${NC}"
adb devices -l

# Navigate to project root
cd "$PROJECT_ROOT" || { echo -e "${RED}Error: Cannot find Android project directory.${NC}"; exit 1; }

# Build the APK
echo -e "${YELLOW}Building Debug APK...${NC}"
if $GRADLEW assembleDebug; then
    echo -e "${GREEN}Build Successful!${NC}"
else
    echo -e "${RED}Build Failed! Check the errors above.${NC}"
    exit 1
fi

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}Error: APK file not found at $APK_PATH${NC}"
    exit 1
fi

# Install APK on all connected devices
DEVICES=$(adb devices | grep -w "device" | awk '{print $1}')

for DEVICE in $DEVICES; do
    echo -e "${YELLOW}Installing on device: $DEVICE${NC}"
    
    # Optional: Uninstall old version first
    # echo "Uninstalling old version..."
    # adb -s "$DEVICE" uninstall "$PACKAGE_NAME"

    if adb -s "$DEVICE" install -r "$APK_PATH"; then
        echo -e "${GREEN}Installation Successful on $DEVICE!${NC}"
        
        # Launch the app
        echo "Launching app..."
        adb -s "$DEVICE" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
    else
        echo -e "${RED}Installation Failed on $DEVICE!${NC}"
    fi
done

echo -e "${GREEN}All tasks completed.${NC}"
