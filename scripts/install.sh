#!/bin/bash
set -e

BASE_URL="https://raw.githubusercontent.com/shocknet/Lightning.Pub/master/scripts"

modules=(
  "utils"
  "check_homebrew"
  "install_rsync_mac"
  "create_launchd_plist"
  "start_services_mac"
  "install_lnd"
  "install_nodejs"
  "install_lightning_pub"
  "start_services"
)

for module in "${modules[@]}"; do
  wget -q "${BASE_URL}/${module}.sh" -O "/tmp/${module}.sh"
  source "/tmp/${module}.sh"
done

# Upgrade flag
SKIP_PROMPT=false
for arg in "$@"; do
  case $arg in
    --yes)
    SKIP_PROMPT=true
    shift
    ;;
  esac
done

detect_os_arch

if [ "$OS" = "Mac" ]; then
  handle_macos
else
  install_lnd
  install_nodejs
  install_lightning_pub
  start_services
fi
