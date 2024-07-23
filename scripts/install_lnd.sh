#!/bin/bash

install_lnd() {
  local lnd_status=0

  log "Starting LND installation/check process..."

  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
    USER_NAME=$SUDO_USER
  else
    USER_HOME=$HOME
    USER_NAME=$(whoami)
  fi

  log "Checking latest LND version..."
  LND_VERSION=$(wget -qO- https://api.github.com/repos/lightningnetwork/lnd/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
  log "Latest LND version: $LND_VERSION"

  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${OS}-${ARCH}-${LND_VERSION}.tar.gz"

  # Check if LND is already installed
  if [ -d "$USER_HOME/lnd" ]; then
    log "LND directory found. Checking current version..."
    CURRENT_VERSION=$("$USER_HOME/lnd/lnd" --version | grep -oP 'version \K[^\s]+')
    log "Current LND version: $CURRENT_VERSION"
    
    if [ "$CURRENT_VERSION" == "${LND_VERSION#v}" ]; then
      log "${SECONDARY_COLOR}LND${RESET_COLOR} is already up-to-date (version $CURRENT_VERSION)."
      lnd_status=2  # Set status to 2 to indicate no action needed
    else
      if [ "$SKIP_PROMPT" != true ]; then
        read -p "LND version $CURRENT_VERSION is installed. Do you want to upgrade to version $LND_VERSION? (y/N): " response
        case "$response" in
          [yY][eE][sS]|[yY]) 
            log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
            lnd_status=1  # Set status to 1 to indicate upgrade
            ;;
          *)
            log "$(date '+%Y-%m-%d %H:%M:%S') Upgrade cancelled."
            lnd_status=2  # Set status to 2 to indicate no action needed
            ;;
        esac
      else
        log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
        lnd_status=1  # Set status to 1 to indicate upgrade
      fi
    fi
  else
    log "LND not found. Proceeding with fresh installation..."
  fi

  if [ $lnd_status -eq 0 ] || [ $lnd_status -eq 1 ]; then
    log "${PRIMARY_COLOR}Downloading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR}..."

    # Start the download
    sudo -u $USER_NAME wget -q $LND_URL -O $USER_HOME/lnd.tar.gz || {
      log "${PRIMARY_COLOR}Failed to download LND.${RESET_COLOR}"
      exit 1
    }

    # Check if LND is already running and stop it if necessary (Linux)
    if [ "$OS" = "Linux" ] && [ "$SYSTEMCTL_AVAILABLE" = true ]; then
      if systemctl is-active --quiet lnd; then
        log "${PRIMARY_COLOR}Stopping${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
        sudo systemctl stop lnd
      fi
    else
      log "${PRIMARY_COLOR}systemctl not found. Please stop ${SECONDARY_COLOR}LND${RESET_COLOR} manually if it is running.${RESET_COLOR}"
    fi

    sudo -u $USER_NAME tar -xzf $USER_HOME/lnd.tar.gz -C $USER_HOME > /dev/null || {
      log "${PRIMARY_COLOR}Failed to extract LND.${RESET_COLOR}"
      exit 1
    }
    rm $USER_HOME/lnd.tar.gz
    sudo -u $USER_NAME mv $USER_HOME/lnd-* $USER_HOME/lnd

    # Create .lnd directory if it doesn't exist
    sudo -u $USER_NAME mkdir -p $USER_HOME/.lnd

    # Check if lnd.conf already exists and avoid overwriting it
    if [ -f $USER_HOME/.lnd/lnd.conf ]; then
      log "${PRIMARY_COLOR}lnd.conf already exists. Skipping creation of new lnd.conf file.${RESET_COLOR}"
    else
      sudo -u $USER_NAME bash -c "cat <<EOF > $USER_HOME/.lnd/lnd.conf
bitcoin.mainnet=true
bitcoin.node=neutrino
neutrino.addpeer=neutrino.shock.network
feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
EOF"
    fi

    log "${SECONDARY_COLOR}LND${RESET_COLOR} installation and configuration completed."
  fi

  log "LND installation/check process complete. Status: $lnd_status"
  # Echo the LND status
  echo "LND_STATUS:$lnd_status"
  return 0  # Always return 0 to indicate success
}