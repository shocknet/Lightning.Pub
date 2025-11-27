#!/bin/bash

install_lnd() {
  local status_file="$1"
  local lnd_status=0

  log "Starting LND installation/check process..."

  USER_HOME=$HOME
  USER_NAME=$(whoami)

  # LND data directory (Mac uses Application Support, Linux uses .lnd)
  if [ "$OS" = "Mac" ]; then
    LND_DIR="$USER_HOME/Library/Application Support/Lnd"
  else
    LND_DIR="$USER_HOME/.lnd"
  fi

  log "Checking latest LND version..."
  LND_VERSION=$(get_latest_release_tag "lightningnetwork/lnd")
  
  if [ -z "$LND_VERSION" ]; then
    log "${PRIMARY_COLOR}Failed to fetch latest LND version.${RESET_COLOR}"
    exit 1
  fi
  log "Latest LND version: $LND_VERSION"

  local LND_OS="$OS"; [ "$OS" = "Mac" ] && LND_OS="darwin"
  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${LND_OS}-${ARCH}-${LND_VERSION}.tar.gz"

  # Check if LND is already installed
  if [ -d "$USER_HOME/lnd" ]; then
    log "LND directory found. Checking current version..."
    CURRENT_VERSION=$("$USER_HOME/lnd/lnd" --version | awk '/version/ {print $3}')
    log "Current LND version: $CURRENT_VERSION"
    
    if [ "$CURRENT_VERSION" == "${LND_VERSION#v}" ]; then
      log "${SECONDARY_COLOR}LND${RESET_COLOR} is already up-to-date (version $CURRENT_VERSION)."
      lnd_status=2  # Set status to 2 to indicate no action needed
    else
      log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
      lnd_status=1  # Set status to 1 to indicate upgrade
    fi
  else
    log "LND not found. Proceeding with fresh installation..."
  fi

  if [ $lnd_status -eq 0 ] || [ $lnd_status -eq 1 ]; then
    log "${PRIMARY_COLOR}Downloading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR}..."

    # Start the download
    download "$LND_URL" "$USER_HOME/lnd.tar.gz" || {
      log "${PRIMARY_COLOR}Failed to download LND.${RESET_COLOR}"
      exit 1
    }

    # Check if LND is already running and stop it if necessary (user-space)
    if [ "$OS" = "Linux" ] && command -v systemctl >/dev/null 2>&1; then
      if systemctl --user is-active --quiet lnd 2>/dev/null; then
        log "${PRIMARY_COLOR}Stopping${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} user service..."
        systemctl --user stop lnd
      fi
    elif [ "$OS" = "Mac" ] && launchctl list 2>/dev/null | grep -q "local.lnd"; then
      log "${PRIMARY_COLOR}Stopping${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} launchd service..."
      launchctl unload "$USER_HOME/Library/LaunchAgents/local.lnd.plist" 2>/dev/null || true
    fi

    log "Extracting LND..."
    LND_TMP_DIR=$(mktemp_in "$USER_HOME")
    
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

    # Create LND data directory if it doesn't exist
    mkdir -p "$LND_DIR"

    # Ensure lnd.conf exists.
    touch "$LND_DIR/lnd.conf"
    
    # Check for and add default settings only if the keys are missing.
    grep -q "^bitcoin.mainnet=" "$LND_DIR/lnd.conf" || echo "bitcoin.mainnet=true" >> "$LND_DIR/lnd.conf"
    grep -q "^bitcoin.node=" "$LND_DIR/lnd.conf" || echo "bitcoin.node=neutrino" >> "$LND_DIR/lnd.conf"
    grep -q "^neutrino.addpeer=neutrino.shock.network" "$LND_DIR/lnd.conf" || echo "neutrino.addpeer=neutrino.shock.network" >> "$LND_DIR/lnd.conf"
    grep -q "^neutrino.addpeer=asia.blixtwallet.com" "$LND_DIR/lnd.conf" || echo "neutrino.addpeer=asia.blixtwallet.com" >> "$LND_DIR/lnd.conf"
    grep -q "^neutrino.addpeer=europe.blixtwallet.com" "$LND_DIR/lnd.conf" || echo "neutrino.addpeer=europe.blixtwallet.com" >> "$LND_DIR/lnd.conf"
    grep -q "^neutrino.addpeer=btcd.lnolymp.us" "$LND_DIR/lnd.conf" || echo "neutrino.addpeer=btcd.lnolymp.us" >> "$LND_DIR/lnd.conf"
    grep -q "^neutrino.addpeer=btcd-mainnet.lightning.computer" "$LND_DIR/lnd.conf" || echo "neutrino.addpeer=btcd-mainnet.lightning.computer" >> "$LND_DIR/lnd.conf"
    grep -q "^fee.url=" "$LND_DIR/lnd.conf" || echo "fee.url=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json" >> "$LND_DIR/lnd.conf"
    
    chmod 600 "$LND_DIR/lnd.conf"

    # Port conflict resolution.
    local lnd_port=9735
    if [ "$OS" = "Linux" ] && ! is_port_available $lnd_port; then
      # The port is occupied. We should intervene if our service is either in a failed state
      # or not active at all (which covers fresh installs and failure loops).
      if systemctl --user -q is-failed lnd.service 2>/dev/null || ! systemctl --user -q is-active lnd.service 2>/dev/null; then
        log "Port $lnd_port is occupied and LND service is not healthy. Attempting to resolve by finding a new port."
        lnd_port_new=$(find_available_port $lnd_port)
        log "Configuring LND to use new port $lnd_port_new."
        
        sed_i '/^listen=/d' "$LND_DIR/lnd.conf"
        echo "listen=0.0.0.0:$lnd_port_new" >> "$LND_DIR/lnd.conf"
        log "LND configuration updated. The service will be restarted by the installer."
      else
        log "Port $lnd_port is in use by a healthy LND service (assumed to be our own). No changes will be made."
      fi
    fi

    log "${SECONDARY_COLOR}LND${RESET_COLOR} installation and configuration completed."
  fi

  log "LND installation/check process complete. Status: $lnd_status"
  
  if [ -n "$status_file" ]; then
    echo "$lnd_status" > "$status_file"
  fi
  
  return 0  # Always return 0 to indicate success
}