#!/bin/bash

install_lnd() {
  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
  else
    USER_HOME=$HOME
  fi

  LND_VERSION=$(wget -qO- https://api.github.com/repos/lightningnetwork/lnd/releases/latest | grep 'tag_name' | cut -d\" -f4)
  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${OS}-${ARCH}-${LND_VERSION}.tar.gz"

  # Check if LND is already installed
  if [ -d "$USER_HOME/lnd" ]; then
    CURRENT_VERSION=$("$USER_HOME/lnd/lnd" --version | grep -oP 'version \K[^\s]+')
    if [ "$CURRENT_VERSION" == "${LND_VERSION#v}" ]; then
      log "${SECONDARY_COLOR}LND${RESET_COLOR} is already up-to-date (version $CURRENT_VERSION)."
      return
    else
      if [ "$SKIP_PROMPT" != true ]; then
        read -p "LND version $CURRENT_VERSION is installed. Do you want to upgrade to version $LND_VERSION? (y/N): " response
        case "$response" in
          [yY][eE][sS]|[yY]) 
            log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
            ;;
          *)
            log "$(date '+%Y-%m-%d %H:%M:%S') Upgrade cancelled."
            return
            ;;
        esac
      else
        log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
      fi
    fi
  fi

  log "${PRIMARY_COLOR}Downloading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR}..."

  # Start the download
  wget -q $LND_URL -O lnd.tar.gz || {
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

  tar -xzf lnd.tar.gz -C $USER_HOME > /dev/null || {
    log "${PRIMARY_COLOR}Failed to extract LND.${RESET_COLOR}"
    exit 1
  }
  rm lnd.tar.gz
  mv $USER_HOME/lnd-* $USER_HOME/lnd

  # Create .lnd directory if it doesn't exist
  mkdir -p $USER_HOME/.lnd

  # Check if lnd.conf already exists and avoid overwriting it
  if [ -f $USER_HOME/.lnd/lnd.conf ]; then
    log "${PRIMARY_COLOR}lnd.conf already exists. Skipping creation of new lnd.conf file.${RESET_COLOR}"
  else
    cat <<EOF > $USER_HOME/.lnd/lnd.conf
bitcoin.mainnet=true
bitcoin.node=neutrino
neutrino.addpeer=neutrino.shock.network
feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
EOF
  fi

  log "${SECONDARY_COLOR}LND${RESET_COLOR} installation and configuration completed."
}