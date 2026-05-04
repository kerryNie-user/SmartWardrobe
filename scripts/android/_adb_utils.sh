ADB_BIN="${ADB_BIN:-adb}"

adb_ensure_available() {
  command -v "${ADB_BIN}" >/dev/null 2>&1
}

adb_list_devices() {
  "${ADB_BIN}" devices 2>/dev/null | awk 'NR>1 && $2=="device" {print $1}'
}

adb_pick_device() {
  wanted_serial="${1:-}"
  devices="$(adb_list_devices)"

  if [ -z "${devices}" ]; then
    return 1
  fi

  if [ -n "${wanted_serial}" ]; then
    echo "${devices}" | grep -Fx "${wanted_serial}" >/dev/null 2>&1
    if [ $? -ne 0 ]; then
      return 1
    fi
    printf "%s" "${wanted_serial}"
    return 0
  fi

  first="$(echo "${devices}" | head -n 1)"
  printf "%s" "${first}"
  return 0
}
