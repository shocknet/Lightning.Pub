#!/bin/bash

start_services() {
  LND_STATUS=$1
  PUB_UPGRADE=$2

  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
    USER_NAME=$SUDO_USER
  else
    USER_HOME=$HOME
    USER_NAME=$(whoami)
  fi

  if [ "$OS" = "Linux" ]; then
    if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
      sudo bash -c "cat > /etc/systemd/system/lnd.service <<EOF
[Unit]
Description=LND Service
After=network.target

[Service]
ExecStart=${USER_HOME}/lnd/lnd
User=${USER_NAME}
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

      sudo bash -c "cat > /etc/systemd/system/lightning_pub.service <<EOF
[Unit]
Description=Lightning.Pub Service
After=network.target

[Service]
ExecStart=/bin/bash -c 'source ${NVM_DIR}/nvm.sh && npm start'
WorkingDirectory=${USER_HOME}/lightning_pub
User=${USER_NAME}
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

      sudo systemctl daemon-reload
      sudo systemctl enable lnd >/dev/null 2>&1
      sudo systemctl enable lightning_pub >/dev/null 2>&1

      # Always attempt to start or restart LND
      if systemctl is-active --quiet lnd; then
        if [ "$LND_STATUS" = "1" ]; then
          log "${PRIMARY_COLOR}Restarting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
          sudo systemctl restart lnd
        else
          log "${SECONDARY_COLOR}LND${RESET_COLOR} service is already running."
        fi
      else
        log "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
        sudo systemctl start lnd
      fi

      # Check LND status after attempting to start/restart
      if ! systemctl is-active --quiet lnd; then
        log "Failed to start or restart ${SECONDARY_COLOR}LND${RESET_COLOR}. Please check the logs."
        exit 1
      fi

      log "Giving ${SECONDARY_COLOR}LND${RESET_COLOR} a few seconds to start before starting ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
      sleep 10

      # Always attempt to start or restart Lightning.Pub
      if systemctl is-active --quiet lightning_pub; then
        if [ "$PUB_UPGRADE" = "100" ]; then
          log "${PRIMARY_COLOR}Restarting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service..."
          sudo systemctl restart lightning_pub
        else
          log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service is already running."
        fi
      else
        log "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service..."
        sudo systemctl start lightning_pub
      fi

      # Check Lightning.Pub status after attempting to start/restart
      if ! systemctl is-active --quiet lightning_pub; then
        log "Failed to start or restart ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}. Please check the logs."
        exit 1
      fi

    else
      create_start_script
      log "systemctl not available. Created start.sh. Please use this script to start the services manually."
    fi
  elif [ "$OS" = "Mac" ]; then
    log "macOS detected. Please configure launchd manually to start ${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} at startup."
    create_start_script
  elif [ "$OS" = "Cygwin" ] || [ "$OS" = "MinGw" ]; then
    log "Windows detected. Please configure your startup scripts manually to start ${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} at startup."
    create_start_script
  else
    log "Unsupported OS detected. Please configure your startup scripts manually."
    create_start_script
  fi
}

create_start_script() {
  cat <<EOF > start.sh
#!/bin/bash
${USER_HOME}/lnd/lnd &
LND_PID=\$!
sleep 10
npm start &
NODE_PID=\$!
wait \$LND_PID
wait \$NODE_PID
EOF
  chmod +x start.sh
  log "systemctl not available. Created start.sh. Please use this script to start the services manually."
}