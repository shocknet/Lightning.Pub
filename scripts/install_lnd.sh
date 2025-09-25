#!/bin/bash

install_lnd() {
  local lnd_status=0

  log "Starting LND installation/check process..."

  USER_HOME=$HOME
  USER_NAME=$(whoami)

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
    wget -q $LND_URL -O $USER_HOME/lnd.tar.gz || {
      log "${PRIMARY_COLOR}Failed to download LND.${RESET_COLOR}"
      exit 1
    }

    # Check if LND is already running and stop it if necessary (user-space)
    if [ "$OS" = "Linux" ] && command -v systemctl >/dev/null 2>&1; then
      if systemctl --user is-active --quiet lnd 2>/dev/null; then
        log "${PRIMARY_COLOR}Stopping${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} user service..."
        systemctl --user stop lnd
      fi
    else
      log "${PRIMARY_COLOR}Please stop ${SECONDARY_COLOR}LND${RESET_COLOR} manually if it is running.${RESET_COLOR}"
    fi

    log "Extracting LND..."
    LND_TMP_DIR=$(mktemp -d -p "$USER_HOME")
    
    tar -xzf "$USER_HOME/lnd.tar.gz" -C "$LND_TMP_DIR" --strip-components=1 > /dev/null || {
      log "${PRIMARY_COLOR}Failed to extract LND.${RESET_COLOR}"
      rm -rf "$LND_TMP_DIR"
      rm -f "$USER_HOME/lnd.tar.gz"
      exit 1
    }
    
    rm "$USER_HOME/lnd.tar.gz"
    
    if [ -d "$USER_HOME/lnd" ]; then
        log "Removing old LND directory..."
        rm -rf "$USER_HOME/lnd"
    fi
    
    mv "$LND_TMP_DIR" "$USER_HOME/lnd" || {
        log "${PRIMARY_COLOR}Failed to move new LND version into place.${RESET_COLOR}"
        exit 1
    }

    # Create .lnd directory if it doesn't exist
    mkdir -p $USER_HOME/.lnd

    # Ensure lnd.conf exists.
    touch $USER_HOME/.lnd/lnd.conf
    
    # Check for and add default settings only if the keys are missing.
    grep -q "^bitcoin.mainnet=" $USER_HOME/.lnd/lnd.conf || echo "bitcoin.mainnet=true" >> $USER_HOME/.lnd/lnd.conf
    grep -q "^bitcoin.node=" $USER_HOME/.lnd/lnd.conf || echo "bitcoin.node=neutrino" >> $USER_HOME/.lnd/lnd.conf
    grep -q "^neutrino.addpeer=" $USER_HOME/.lnd/lnd.conf || echo "neutrino.addpeer=neutrino.shock.network" >> $USER_HOME/.lnd/lnd.conf
    grep -q "^fee.url=" $USER_HOME/.lnd/lnd.conf || echo "fee.url=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json" >> $USER_HOME/.lnd/lnd.conf
    
    chmod 600 $USER_HOME/.lnd/lnd.conf

    # Port conflict resolution for fresh installs
    if [ $lnd_status -eq 0 ]; then
      local lnd_port=9735
      if ! is_port_available $lnd_port; then
        if ! systemctl --user -q is-active lnd.service >/dev/null 2>&1; then
          log "Port $lnd_port is in use by another process. Finding an alternative port."
          lnd_port_new=$(find_available_port $lnd_port)
          log "Configuring LND to use port $lnd_port_new."
          
          # Remove any existing listen entry and add the new one.
          sed -i '/^listen=/d' $USER_HOME/.lnd/lnd.conf
          echo "listen=:$lnd_port_new" >> $USER_HOME/.lnd/lnd.conf
        else
          log "Port $lnd_port is in use, but it seems to be by our own lnd service. No changes made."
        fi
      fi
    fi

    log "${SECONDARY_COLOR}LND${RESET_COLOR} installation and configuration completed."
  fi

  log "LND installation/check process complete. Status: $lnd_status"
  # Echo the LND status
  echo "LND_STATUS:$lnd_status"
  return 0  # Always return 0 to indicate success
}