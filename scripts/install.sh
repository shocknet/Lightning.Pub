#!/bin/bash
set -e

# --- Use a secure temporary log file during installation ---
TMP_LOG_FILE=$(mktemp)

log() {
  local message="$(date '+%Y-%m-%d %H:%M:%S') $1"
  echo -e "$message"
  # Write to the temporary log file.
  echo -e "$(echo "$message" | sed 's/\\e\[[0-9;]*m//g')" >> "$TMP_LOG_FILE"
}

SCRIPT_VERSION="0.2.0"
REPO="shocknet/Lightning.Pub"
BRANCH="script"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
REPO_URL="https://github.com/${REPO}/tarball/${BRANCH}"
SCRIPTS_URL="${BASE_URL}/scripts/"

cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$HOME/lightning_pub_tmp" 2>/dev/null || true
}

trap cleanup EXIT

log_error() {
    log "ERROR: $1"
    log "Exiting with status $2"
    exit $2
}


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

# Create user-space temp directory
mkdir -p "$HOME/lightning_pub_tmp"

for module in "${modules[@]}"; do
  wget -q "${SCRIPTS_URL}${module}.sh" -O "$HOME/lightning_pub_tmp/${module}.sh" || log_error "Failed to download ${module}.sh" 1
  source "$HOME/lightning_pub_tmp/${module}.sh" || log_error "Failed to source ${module}.sh" 1
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

  # Run install_lightning_pub and capture its exit code directly.
  # We expect specific exit codes (0 for success, 2 for no update), so we handle them.
  install_lightning_pub "$REPO_URL"
  pub_install_status=$?
  
  case $pub_install_status in
    0) 
      log "Lightning.Pub fresh installation completed successfully."
      pub_upgrade_status=0 # Indicates a fresh install, services should start
      ;;
    100)
      log "Lightning.Pub upgrade completed successfully."
      pub_upgrade_status=100 # Indicates an upgrade, services should restart
      ;;
    2) 
      log "Lightning.Pub is already up-to-date. No action needed."
      pub_upgrade_status=2 # Special status to skip service restart
      ;;
    *) 
      log_error "Lightning.Pub installation failed with exit code $pub_install_status" $pub_install_status
      ;;
  esac

  # Only start services if it was a fresh install or an upgrade.
  if [ "$pub_upgrade_status" -eq 0 ] || [ "$pub_upgrade_status" -eq 100 ]; then
    log "Starting services..."
    touch /tmp/pub_install_timestamp
    start_services $lnd_status $pub_upgrade_status || log_error "Failed to start services" 1
    get_log_info || log_error "Failed to get log info" 1
  fi

  log "Installation process completed successfully"

  # --- Move temporary log to permanent location ---
  if [ -d "$HOME/lightning_pub" ]; then
    mv "$TMP_LOG_FILE" "$HOME/lightning_pub/install.log"
    chmod 600 "$HOME/lightning_pub/install.log"
  else
    # If the installation failed before the dir was created, clean up the temp log.
    rm -f "$TMP_LOG_FILE"
  fi
fi