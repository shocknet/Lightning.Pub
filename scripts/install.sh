#!/bin/bash
set -e

log_error() {
    log "ERROR: $1"
    log "Exiting with status $2"
    exit $2
}

BASE_URL="https://raw.githubusercontent.com/shocknet/Lightning.Pub/master/scripts/"

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
  "extract_nprofile"
)

for module in "${modules[@]}"; do
  wget -q "${BASE_URL}/${module}.sh" -O "/tmp/${module}.sh"
  source "/tmp/${module}.sh"
done

detect_os_arch

if [ "$OS" = "Mac" ]; then
  handle_macos
else
  lnd_output=$(install_lnd)
  install_result=$?

  if [ $install_result -ne 0 ]; then
    log_error "LND installation failed" $install_result
  fi

  # Extract the LND status from the output
  lnd_status=$(echo "$lnd_output" | grep "LND_STATUS:" | cut -d':' -f2)

  case $lnd_status in
    0) log "LND fresh installation completed successfully." ;;
    1) log "LND upgrade completed successfully." ;;
    2) log "LND is already up-to-date. No action needed." ;;
    *) log "WARNING: Unexpected status from install_lnd: $lnd_status" ;;
  esac

  install_nodejs || log_error "NodeJS installation failed" $?

  pub_output=$(install_lightning_pub)
  install_result=$?

  if [ $install_result -ne 0 ]; then
    log_error "Lightning.Pub installation failed" $install_result
  fi

  # Extract the upgrade status from the output
  pub_upgrade_status=$(echo "$pub_output" | grep "UPGRADE_STATUS:" | cut -d':' -f2)

  if [ "$pub_upgrade_status" = "100" ]; then
    log "Lightning.Pub upgrade completed successfully."
  elif [ "$pub_upgrade_status" = "0" ]; then
    log "Lightning.Pub fresh installation completed successfully."
  else
    log "WARNING: Unexpected return status from install_lightning_pub: $pub_upgrade_status"
    log "Full output: $pub_output"
  fi

  log "Starting services..."
  start_services $lnd_status $pub_upgrade_status
  get_log_info

  log "Installation process completed successfully"
fi