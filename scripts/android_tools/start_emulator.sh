#!/bin/bash

set -euo pipefail

AVD_NAME="${1:-}"

if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  EMULATOR_BIN="$ANDROID_SDK_ROOT/emulator/emulator"
elif [ -n "${ANDROID_HOME:-}" ]; then
  EMULATOR_BIN="$ANDROID_HOME/emulator/emulator"
elif command -v emulator >/dev/null 2>&1; then
  EMULATOR_BIN="$(command -v emulator)"
elif [ -x "$HOME/Library/Android/sdk/emulator/emulator" ]; then
  EMULATOR_BIN="$HOME/Library/Android/sdk/emulator/emulator"
else
  echo "emulator not found (set ANDROID_SDK_ROOT/ANDROID_HOME or install Android SDK)."
  exit 1
fi

if adb devices | awk 'NR>1 && $2=="device" {print $1}' | grep -q '^emulator-'; then
  echo "Emulator already connected."
else
  if [ -z "$AVD_NAME" ]; then
    AVD_NAME="$("$EMULATOR_BIN" -list-avds | head -n 1 | tr -d '\r')"
  fi

  if [ -z "$AVD_NAME" ]; then
    echo "No AVD found. Create one in Android Studio (AVD Manager) first."
    exit 1
  fi

  echo "Starting emulator: $AVD_NAME"
  "$EMULATOR_BIN" @"$AVD_NAME" -netdelay none -netspeed full >/dev/null 2>&1 &
fi

echo "Waiting for device..."
adb wait-for-device >/dev/null

echo "Waiting for boot..."
BOOT=""
for _ in {1..180}; do
  BOOT="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [ "$BOOT" = "1" ]; then
    break
  fi
  sleep 2
done

if [ "$BOOT" != "1" ]; then
  echo "Boot not completed."
  exit 1
fi

adb shell input keyevent 82 >/dev/null 2>&1 || true
echo "Emulator ready: $(adb devices | awk 'NR==2 {print $1}')"
