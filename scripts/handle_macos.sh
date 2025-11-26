#!/bin/bash

# macOS-specific installation handler
# Called from install.sh when OS=Mac

handle_macos() {
  local REPO_URL="$1"
  
  export INSTALL_DIR="$HOME/lightning_pub"
  export LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
  mkdir -p "$LAUNCH_AGENTS_DIR"

  # Install Homebrew if needed
  if ! command -v brew &> /dev/null; then
    log "${PRIMARY_COLOR}Installing Homebrew...${RESET_COLOR}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
      log_error "Failed to install Homebrew" 1
    }
  fi

  # Install LND
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

  # Install Node.js
  install_nodejs || log_error "Failed to install Node.js" 1

  # Install Lightning.Pub
  install_lightning_pub "$REPO_URL" || pub_install_status=$?
  
  case ${pub_install_status:-0} in
    0) 
      log "Lightning.Pub fresh installation completed successfully."
      pub_upgrade_status=0
      ;;
    100)
      log "Lightning.Pub upgrade completed successfully."
      pub_upgrade_status=100
      ;;
    2) 
      log "Lightning.Pub is already up-to-date. No action needed."
      pub_upgrade_status=2
      ;;
    *) 
      log_error "Lightning.Pub installation failed with exit code $pub_install_status" "$pub_install_status"
      ;;
  esac

  # Start services using launchd
  if [ "$pub_upgrade_status" -eq 0 ] || [ "$pub_upgrade_status" -eq 100 ]; then
    log "Starting services..."
    if [ "$lnd_status" = "0" ] || [ "$lnd_status" = "1" ]; then
      log "Note: LND may take several minutes to sync block headers depending on network conditions."
    fi
    
    create_launchd_plists
    
    # Start/restart services
    for svc in local.lnd local.lightning_pub; do
      local plist="$LAUNCH_AGENTS_DIR/${svc}.plist"
      if launchctl list 2>/dev/null | grep -q "$svc"; then
        launchctl unload "$plist" 2>/dev/null || true
      fi
      launchctl load "$plist"
    done
    log "${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} services started."

    TIMESTAMP_FILE=$(mktemp)
    export TIMESTAMP_FILE
    get_log_info || log_error "Failed to get log info" 1
  fi

  log "Installation process completed successfully"

  if [ -d "$HOME/lightning_pub" ]; then
    mv "$TMP_LOG_FILE" "$HOME/lightning_pub/install.log"
    chmod 600 "$HOME/lightning_pub/install.log"
  else
    rm -f "$TMP_LOG_FILE"
  fi
}

create_launchd_plists() {
  local NVM_DIR="$HOME/.nvm"
  
  # LND plist
  if [ ! -f "$LAUNCH_AGENTS_DIR/local.lnd.plist" ]; then
    cat > "$LAUNCH_AGENTS_DIR/local.lnd.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>local.lnd</string>
  <key>ProgramArguments</key>
  <array>
    <string>$HOME/lnd/lnd</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
EOF
  fi

  # Lightning.Pub plist
  if [ ! -f "$LAUNCH_AGENTS_DIR/local.lightning_pub.plist" ]; then
    cat > "$LAUNCH_AGENTS_DIR/local.lightning_pub.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>local.lightning_pub</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>source $NVM_DIR/nvm.sh &amp;&amp; npm start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$INSTALL_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
EOF
  fi
}

