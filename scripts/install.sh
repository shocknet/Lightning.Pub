#!/bin/bash
set -e

# --- Use a secure temporary log file during installation ---
TMP_LOG_FILE=$(mktemp)

# ANSI color codes for logging
PRIMARY_COLOR='\e[0;36m' # Cyan
SECONDARY_COLOR='\e[0;33m' # Yellow
GREEN_COLOR='\e[0;32m' # Green
YELLOW_COLOR='\e[0;33m' # Yellow
RED_COLOR='\e[0;31m' # Red
RESET_COLOR='\e[0m' # Reset to default

log() {
  local message="$(date '+%Y-%m-%d %H:%M:%S') $1"
  echo -e "$message"
  # Write to the temporary log file, stripping ANSI color codes.
  echo -e "$(echo "$message" | sed 's/\\e\[[0-9;]*m//g')" >> "$TMP_LOG_FILE"
}

SCRIPT_VERSION="0.2.2"
REPO="shocknet/Lightning.Pub"
BRANCH="master"

# Variable to control QR code rendering. Default is false.
RENDER_QR=false

cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TMP_DIR" 2>/dev/null || true
}

trap cleanup EXIT

log_error() {
    log "${RED_COLOR}ERROR: $1${RESET_COLOR}"
    log "${RED_COLOR}Exiting with status $2${RESET_COLOR}"
    exit $2
}

# Function to generate and display a QR code for a given string.
# It checks for `qrencode` and attempts to install it if missing.
generate_qr_code() {
  local data_string="$1"
  local qrencode_cmd="qrencode" # The utility command

  # Check if qrencode is already installed
  if ! command -v "$qrencode_cmd" &>/dev/null; then
    log "${YELLOW_COLOR}qrencode utility not found. Attempting to install...${RESET_COLOR}"
    local install_successful=false
    local package_manager=""

    # Detect OS and attempt to install qrencode using appropriate package manager
    if command -v apt-get &>/dev/null; then
      package_manager="apt-get"
      log "  - Found apt-get. Updating package lists and installing qrencode..."
      if sudo apt-get update &>/dev/null && sudo apt-get install -y qrencode &>/dev/null; then
        install_successful=true
      fi
    elif command -v yum &>/dev/null; then
      package_manager="yum"
      log "  - Found yum. Installing qrencode..."
      if sudo yum install -y qrencode &>/dev/null; then
        install_successful=true
      fi
    elif command -v dnf &>/dev/null; then
      package_manager="dnf"
      log "  - Found dnf. Installing qrencode..."
      if sudo dnf install -y qrencode &>/dev/null; then
        install_successful=true
      fi
    elif command -v pacman &>/dev/null; then
      package_manager="pacman"
      log "  - Found pacman. Updating and installing qrencode..."
      if sudo pacman -Sy --noconfirm qrencode &>/dev/null; then
        install_successful=true
      fi
    elif command -v apk &>/dev/null; then
      package_manager="apk"
      log "  - Found apk. Installing qrencode..."
      if sudo apk add qrencode &>/dev/null; then
        install_successful=true
      fi
    elif command -v brew &>/dev/null; then
      package_manager="brew"
      log "  - Found brew. Installing qrencode..."
      if brew install qrencode &>/dev/null; then
        install_successful=true
      fi
    fi

    if [ "$install_successful" = "true" ]; then
      log "${GREEN_COLOR}qrencode installed successfully using $package_manager.${RESET_COLOR}"
    else
      log "${RED_COLOR}WARNING: Failed to install qrencode. QR code display not possible.${RESET_COLOR}"
      log "Please install qrencode manually (e.g., 'sudo apt install qrencode') to enable this feature."
      return 1 # Indicate failure to generate QR code
    fi
  fi

  # Double-check if qrencode is available after a potential installation attempt
  if command -v "$qrencode_cmd" &>/dev/null; then
    log "" # Add a newline for better visual spacing
    log "${YELLOW_COLOR}Scan this QR code to connect:${RESET_COLOR}"
    echo "$data_string" | "$qrencode_cmd" -t ANSIUTF8 2>/dev/null || log "${RED_COLOR}Error rendering QR code with qrencode. Ensure your terminal supports ANSI UTF-8.${RESET_COLOR}"
    log "${YELLOW_COLOR}Alternatively, copy/paste the following:${RESET_COLOR}"
  else
    log "${RED_COLOR}Error: qrencode is not available. Cannot generate QR code.${RESET_COLOR}"
    return 1 # Indicate failure to generate QR code
  fi
}

modules=(
  "utils"
  "ports"
  "install_lnd"
  "install_nodejs"
  "install_lightning_pub"
  "start_services"
  "extract_nprofile"
)

log "Script version $SCRIPT_VERSION"

# Parse args for branch override and QR option
while [[ $# -gt 0 ]]; do
  case $1 in
    --branch=*)
      BRANCH="${1#*=}"
      shift
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --qr)
      RENDER_QR=true
      shift
      ;;
    *)
      # Ignore unknown arguments to maintain compatibility with future additions
      shift
      ;;
  esac
done

BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
REPO_URL="https://github.com/${REPO}/tarball/${BRANCH}"
SCRIPTS_URL="${BASE_URL}/scripts/"

TMP_DIR=$(mktemp -d)

for module in "${modules[@]}"; do
  wget -q "${SCRIPTS_URL}${module}.sh" -O "${TMP_DIR}/${module}.sh" || log_error "Failed to download ${module}.sh" 1
  source "${TMP_DIR}/${module}.sh" || log_error "Failed to source ${module}.sh" 1
done

detect_os_arch

# Define installation paths based on user
if [ "$(id -u)" -eq 0 ]; then
  IS_ROOT=true
  # For root, install under /opt for system-wide access
  export INSTALL_DIR="/opt/lightning_pub"
  export UNIT_DIR="/etc/systemd/system"
  export SYSTEMCTL_CMD="systemctl"
  log "Running as root: App will be installed in $INSTALL_DIR"
else
  IS_ROOT=false
  export INSTALL_DIR="$HOME/lightning_pub"
  export UNIT_DIR="$HOME/.config/systemd/user"
  export SYSTEMCTL_CMD="systemctl --user"
fi

check_deps
log "Detected OS: $OS"
log "Detected ARCH: $ARCH"

if [ "$OS" = "Mac" ]; then
  log_error "macOS is not currently supported by this install script. Please use a Linux-based system." 1
else
  # Explicit kickoff log for LND so the flow is clear in the install log
  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR}..."
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
  # Exit codes from install_lightning_pub: 0=fresh, 100=upgrade, 2=no-op
  install_lightning_pub "$REPO_URL" || pub_install_status=$?
  
  case ${pub_install_status:-0} in
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
      log_error "Lightning.Pub installation failed with exit code $pub_install_status" "$pub_install_status"
      ;;
  esac

  # Only start services if it was a fresh install or an upgrade.
  if [ "$pub_upgrade_status" -eq 0 ] || [ "$pub_upgrade_status" -eq 100 ]; then
    log "Starting services..."
    if [ "$lnd_status" = "0" ] || [ "$lnd_status" = "1" ]; then
      log "Note: LND may take several minutes to sync block headers depending on network conditions."
    fi
    TIMESTAMP_FILE=$(mktemp)
    export TIMESTAMP_FILE
    start_services $lnd_status $pub_upgrade_status || log_error "Failed to start services" 1
    get_log_info || log_error "Failed to get log info" 1
  fi

  # --- Display connection info (nprofile) ---
  log "Extracting nprofile for connection..."
  NPROFILE=$(extract_nprofile)
  if [ -n "$NPROFILE" ]; then
    # If the --qr flag is used, display the QR code and the text.
    if [ "$RENDER_QR" = "true" ]; then
      generate_qr_code "$NPROFILE"
      log "${GREEN_COLOR}$NPROFILE${RESET_COLOR}"
    else
      # Otherwise, display the standard text-only output.
      log "${GREEN_COLOR}Installation complete! Use the following nprofile to connect:${RESET_COLOR}"
      log "${GREEN_COLOR}$NPROFILE${RESET_COLOR}"
    fi
  else
    log "${YELLOW_COLOR}Could not automatically extract nprofile. Please check logs for details.${RESET_COLOR}"
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