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

  # Ensure NVM_DIR is set
  if [ -z "$NVM_DIR" ]; then
    export NVM_DIR="$USER_HOME/.nvm"
  fi

  if [ "$OS" = "Linux" ]; then
    if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
      mkdir -p "$USER_HOME/.config/systemd/user"
      cat > "$USER_HOME/.config/systemd/user/lnd.service" <<EOF
[Unit]
Description=LND Service
After=network.target

[Service]
ExecStart=${USER_HOME}/lnd/lnd
Restart=always

[Install]
WantedBy=default.target
EOF

      cat > "$USER_HOME/.config/systemd/user/lightning_pub.service" <<EOF
[Unit]
Description=Lightning.Pub Service
After=network.target

[Service]
ExecStart=/bin/bash -c 'source ${NVM_DIR}/nvm.sh && npm start'
WorkingDirectory=${USER_HOME}/lightning_pub
Restart=always

[Install]
WantedBy=default.target
EOF

      systemctl --user daemon-reload
      systemctl --user enable lnd >/dev/null 2>&1
      systemctl --user enable lightning_pub >/dev/null 2>&1

      # Always attempt to start or restart LND
      if systemctl --user is-active --quiet lnd; then
        if [ "$LND_STATUS" = "1" ]; then
          log "${PRIMARY_COLOR}Restarting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
          systemctl --user restart lnd
        else
          log "${SECONDARY_COLOR}LND${RESET_COLOR} service is already running."
        fi
      else
        log "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
        systemctl --user start lnd
      fi

      # Check LND status after attempting to start/restart
      if ! systemctl --user is-active --quiet lnd; then
        log "Failed to start or restart ${SECONDARY_COLOR}LND${RESET_COLOR}. Please check the logs."
        exit 1
      fi

      if [ "$LND_STATUS" = "0" ] || [ "$LND_STATUS" = "1" ]; then
        log "Giving ${SECONDARY_COLOR}LND${RESET_COLOR} a few seconds to start before starting ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
        sleep 10
      fi

      # Always attempt to start or restart Lightning.Pub
      if systemctl --user is-active --quiet lightning_pub; then
        if [ "$PUB_UPGRADE" = "100" ]; then
          log "${PRIMARY_COLOR}Restarting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service..."
          systemctl --user restart lightning_pub
        else
          log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service is already running."
        fi
      else
        log "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service..."
        systemctl --user start lightning_pub
      fi

      # Check Lightning.Pub status after attempting to start/restart
      if ! systemctl --user is-active --quiet lightning_pub; then
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
wait \$LND_PID \$NODE_PID
EOF
  chmod +x start.sh
}