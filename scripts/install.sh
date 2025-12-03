#!/bin/bash
set -e

# --- Use a secure temporary log file during installation ---
TMP_LOG_FILE=$(mktemp)

log() {
  local message="$(date '+%Y-%m-%d %H:%M:%S') $1"
  # Use printf for cross-platform compatibility (macOS echo -e issues)
  printf "%b\n" "$message"
  # Write to the temporary log file (strip colors)
  echo "$message" | sed 's/\\e\[[0-9;]*m//g' >> "$TMP_LOG_FILE"
}

SCRIPT_VERSION="0.3.0"
REPO="shocknet/Lightning.Pub"
BRANCH="master"

cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TMP_DIR" 2>/dev/null || true
}

trap cleanup EXIT

log_error() {
    log "ERROR: $1"
    log "Exiting with status $2"
    exit $2
}

# Detect OS early for bootstrap
OS="$(uname -s)"
case "$OS" in
  Linux*)     OS=Linux;;
  Darwin*)    OS=Mac;;
  *)          OS="UNKNOWN"
esac

detect_os_arch() {
  # OS already detected above, but we need ARCH and systemctl check
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64)     ARCH=amd64;;
    arm64|aarch64|armv8*) ARCH=arm64;;
    armv7*)     ARCH=armv7;;
    *)          ARCH="UNKNOWN"
  esac

  if [ "$OS" = "Linux" ] && command -v systemctl &> /dev/null; then
    SYSTEMCTL_AVAILABLE=true
  else
    SYSTEMCTL_AVAILABLE=false
  fi
}

PRIMARY_COLOR="\e[38;5;208m"
SECONDARY_COLOR="\e[38;5;165m"
RESET_COLOR="\e[0m"

check_deps() {
  for cmd in grep stat tar; do
    if ! command -v $cmd &> /dev/null; then
      log "Missing system dependency: $cmd. Install $cmd via your package manager and retry."
      exit 1
    fi
  done

  # Check for wget or curl (one is required)
  if ! command -v wget &> /dev/null && ! command -v curl &> /dev/null; then
    log "Missing system dependency: wget or curl. Install via your package manager and retry."
    exit 1
  fi

  if ! command -v sha256sum &> /dev/null && ! command -v shasum &> /dev/null; then
    log "Missing system dependency: sha256sum or shasum."
    exit 1
  fi
}

# Cross-platform sed in-place
sed_i() {
  if [ "$OS" = "Mac" ]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Cross-platform mktemp with parent directory
mktemp_in() {
  local parent="$1"
  if [ "$OS" = "Mac" ]; then
    mktemp -d "${parent}/tmp.XXXXXX"
  else
    mktemp -d -p "$parent"
  fi
}

# Extract JSON value (cross-platform)
json_value() {
  local key="$1"
  if [ "$OS" = "Mac" ]; then
    echo "$2" | grep "\"${key}\"" | awk -F'"' '{print $4; exit}'
  else
    echo "$2" | grep -oP "\"${key}\": \"\\K[^\"]+"
  fi
}

# Download file (wget or curl)
download() {
  local url="$1"
  local dest="$2"
  if [ "$OS" = "Mac" ]; then
    curl -fsL "$url" -o "$dest"
  else
    wget -q "$url" -O "$dest"
  fi
}

# Download to stdout (wget or curl)
download_stdout() {
  local url="$1"
  if [ "$OS" = "Mac" ]; then
    curl -fsL "$url"
  else
    wget -qO- "$url"
  fi
}

# Get latest release tag from GitHub (via API)
get_latest_release_tag() {
  local repo="$1"
  local url="https://api.github.com/repos/${repo}/releases/latest"
  local api_json=$(download_stdout "$url")
  json_value "tag_name" "$api_json"
}


modules=(
  "ports"
  "install_lnd"
  "install_nodejs"
  "install_lightning_pub"
  "start_services"
  "handle_macos"
  "extract_nprofile"
)

log "Script version $SCRIPT_VERSION"

# Parse args for branch override
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
    *)
      shift
      ;;
  esac
done

BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
REPO_URL="https://github.com/${REPO}/tarball/${BRANCH}"
SCRIPTS_URL="${BASE_URL}/scripts/"

TMP_DIR=$(mktemp -d)

for module in "${modules[@]}"; do
  download "${SCRIPTS_URL}${module}.sh" "${TMP_DIR}/${module}.sh" || log_error "Failed to download ${module}.sh" 1
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
  handle_macos "$REPO_URL"
else
  # Explicit kickoff log for LND so the flow is clear in the install log
  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR}..."
  LND_STATUS_FILE=$(mktemp)
  install_lnd "$LND_STATUS_FILE"
  install_result=$?

  if [ $install_result -ne 0 ]; then
    rm -f "$LND_STATUS_FILE"
    log_error "LND installation failed" $install_result
  fi

  lnd_status=$(cat "$LND_STATUS_FILE")
  rm -f "$LND_STATUS_FILE"

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