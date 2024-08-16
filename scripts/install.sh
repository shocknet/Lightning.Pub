#!/bin/bash
set -e

LOG_FILE="/var/log/pubdeploy.log"

touch $LOG_FILE
chmod 644 $LOG_FILE

log() {
  local message="$(date '+%Y-%m-%d %H:%M:%S') $1"
  echo -e "$message"
  echo -e "$(echo $message | sed 's/\\e\[[0-9;]*m//g')" >> $LOG_FILE
}

SCRIPT_VERSION="0.1.0"

cleanup() {
    echo "Cleaning up temporary files..."
    rm -f /tmp/*.sh
}

trap cleanup EXIT

log_error() {
    log "ERROR: $1"
    log "Exiting with status $2"
    exit $2
}

BASE_URL="https://raw.githubusercontent.com/shocknet/Lightning.Pub/fix-arm/scripts/"

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

log "Script version $SCRIPT_VERSION"

for module in "${modules[@]}"; do
  wget -q "${BASE_URL}/${module}.sh" -O "/tmp/${module}.sh" || log_error "Failed to download ${module}.sh" 1
  source "/tmp/${module}.sh" || log_error "Failed to source ${module}.sh" 1
done

detect_os_arch
log "Detected OS: $OS"
log "Detected ARCH: $ARCH"

if [ "$OS" = "Mac" ]; then
  log "Handling macOS specific setup"
  handle_macos || log_error "macOS setup failed" 1
else
  lnd_output=$(install_lnd)
  install_result=$?

  if [ $install_result -ne 0 ]; then
    log_error "LND installation failed" $install_result
  fi

  lnd_status=$(echo "$lnd_output" | grep "LND_STATUS:" | cut -d':' -f2)

  case $lnd_status in
    0) log "LND fresh installation completed successfully." ;;
    1) log "LND upgrade completed successfully." ;;
    2) log "LND is already up-to-date. No action needed." ;;
    *) log "WARNING: Unexpected status from install_lnd: $lnd_status" ;;
  esac

 install_nodejs || log_error "Failed to install Node.js" 1

 install_lightning_pub || log_error "Failed to install Lightning.Pub" 1

  log "Starting services..."
  start_services $lnd_status $pub_upgrade_status || log_error "Failed to start services" 1
  get_log_info || log_error "Failed to get log info" 1

  log "Installation process completed successfully"
fi