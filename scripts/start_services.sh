#!/bin/bash

start_services() {
  LND_STATUS=$1
  PUB_UPGRADE=$2

  USER_HOME=$HOME
  USER_NAME=$(whoami)


  # Ensure NVM_DIR is set
  if [ -z "$NVM_DIR" ]; then
    export NVM_DIR="$USER_HOME/.nvm"
  fi

  if [ "$OS" = "Linux" ]; then
    if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
      mkdir -p "$UNIT_DIR"

      # Check and create lnd.service if needed (only if it doesn't exist)
      LND_UNIT="$UNIT_DIR/lnd.service"
      if [ ! -f "$LND_UNIT" ]; then
        NEW_LND_CONTENT="[Unit]\nDescription=LND Service\nAfter=network.target\n\n[Service]\nExecStart=${USER_HOME}/lnd/lnd\nRestart=always\n\n[Install]\nWantedBy=default.target"
        echo -e "$NEW_LND_CONTENT" > "$LND_UNIT"
        $SYSTEMCTL_CMD daemon-reload
        $SYSTEMCTL_CMD enable lnd >/dev/null 2>&1
      fi

      # Check and create lightning_pub.service if needed (only if it doesn't exist)
      PUB_UNIT="$UNIT_DIR/lightning_pub.service"
      if [ ! -f "$PUB_UNIT" ]; then
        NEW_PUB_CONTENT="[Unit]\nDescription=Lightning.Pub Service\nAfter=network.target\n\n[Service]\nExecStart=/bin/bash -c 'source ${NVM_DIR}/nvm.sh && npm start'\nWorkingDirectory=${INSTALL_DIR}\nRestart=always\n\n[Install]\nWantedBy=default.target"
        echo -e "$NEW_PUB_CONTENT" > "$PUB_UNIT"
        $SYSTEMCTL_CMD daemon-reload
        $SYSTEMCTL_CMD enable lightning_pub >/dev/null 2>&1
      fi

      # Only start/restart LND if it was freshly installed or upgraded
      if [ "$LND_STATUS" = "0" ] || [ "$LND_STATUS" = "1" ]; then
        if $SYSTEMCTL_CMD is-active --quiet lnd; then
          log "${PRIMARY_COLOR}Restarting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
          $SYSTEMCTL_CMD restart lnd
        else
          log "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
          $SYSTEMCTL_CMD start lnd
        fi

        # Check LND status after attempting to start/restart
        if ! $SYSTEMCTL_CMD is-active --quiet lnd; then
          log "Failed to start or restart ${SECONDARY_COLOR}LND${RESET_COLOR}. Please check the logs."
          exit 1
        fi
      else
        log "${SECONDARY_COLOR}LND${RESET_COLOR} not updated, service status unchanged."
      fi

      if [ "$PUB_UPGRADE" = "0" ] || [ "$PUB_UPGRADE" = "100" ]; then
        if [ "$PUB_UPGRADE" = "100" ]; then
            log "${PRIMARY_COLOR}Restarting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service after upgrade..."
        else
            log "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service..."
        fi
        $SYSTEMCTL_CMD start lightning_pub
      fi

      # Check Lightning.Pub status after attempting to start
      if [ "$PUB_UPGRADE" = "0" ] || [ "$PUB_UPGRADE" = "100" ]; then
          if ! $SYSTEMCTL_CMD is-active --quiet lightning_pub; then
            log "Failed to start or restart ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}. Please check the logs."
            exit 1
          fi
      fi

    else
      log "systemctl not available. Please start the services manually (e.g., run lnd and npm start in separate terminals)."
    fi
  elif [ "$OS" = "Mac" ]; then
    # NOTE: macOS support is untested and unsupported. Use at your own risk. (restore)
    log "macOS detected. Please configure launchd manually..."
  elif [ "$OS" = "Cygwin" ] || [ "$OS" = "MinGw" ]; then
    log "Windows detected. Please configure your startup scripts manually to start ${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} at startup."
  else
    log "Unsupported OS detected. Please configure your startup scripts manually."
  fi
}