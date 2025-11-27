#!/bin/bash

# macOS-specific installation handler
# Called from install.sh when OS=Mac

handle_macos() {
  local REPO_URL="$1"
  
  export INSTALL_DIR="$HOME/lightning_pub"
  export LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
  mkdir -p "$LAUNCH_AGENTS_DIR"

  # Install LND
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
  log "Run 'source ~/.zshrc' or open a new terminal to use lpub-status, lpub-log, etc."

  if [ -d "$HOME/lightning_pub" ]; then
    mv "$TMP_LOG_FILE" "$HOME/lightning_pub/install.log"
    chmod 600 "$HOME/lightning_pub/install.log"
  else
    rm -f "$TMP_LOG_FILE"
  fi
}

create_launchd_plists() {
  local NVM_DIR="$HOME/.nvm"
  local NODE_BIN="$HOME/node/bin"
  
  # Create wrapper scripts so macOS shows proper names in Background Items
  mkdir -p "$HOME/.local/bin"
  
  # LND wrapper
  cat > "$HOME/.local/bin/LND" <<EOF
#!/bin/bash
exec "$HOME/lnd/lnd" "\$@"
EOF
  chmod +x "$HOME/.local/bin/LND"
  
  # Lightning.Pub wrapper
  cat > "$HOME/.local/bin/Lightning.Pub" <<EOF
#!/bin/bash
export PATH="$NODE_BIN:\$PATH"
cd "$INSTALL_DIR"
exec "$NODE_BIN/npm" start
EOF
  chmod +x "$HOME/.local/bin/Lightning.Pub"

  # Add aliases to shell profile
  local shell_profile="$HOME/.zshrc"
  [ -f "$HOME/.bash_profile" ] && ! [ -f "$HOME/.zshrc" ] && shell_profile="$HOME/.bash_profile"
  
  if ! grep -q 'lpub-start' "$shell_profile" 2>/dev/null; then
    cat >> "$shell_profile" <<'ALIASES'

# Lightning.Pub service management
alias lpub-start='launchctl load ~/Library/LaunchAgents/local.lightning_pub.plist ~/Library/LaunchAgents/local.lnd.plist'
alias lpub-stop='launchctl unload ~/Library/LaunchAgents/local.lightning_pub.plist ~/Library/LaunchAgents/local.lnd.plist'
alias lpub-restart='lpub-stop; lpub-start'
alias lpub-log='tail -f ~/Library/Logs/Lightning.Pub/pub.log'
alias lnd-log='tail -f ~/Library/Logs/Lightning.Pub/lnd.log'
alias lpub-status='launchctl list | grep local.lightning_pub; launchctl list | grep local.lnd'
ALIASES
  fi
  
  # Create log directory
  mkdir -p "$HOME/Library/Logs/Lightning.Pub"

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
    <string>$HOME/.local/bin/LND</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/Lightning.Pub/lnd.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/Lightning.Pub/lnd.log</string>
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
    <string>$HOME/.local/bin/Lightning.Pub</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$INSTALL_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/Lightning.Pub/pub.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/Lightning.Pub/pub.log</string>
</dict>
</plist>
EOF
  fi
}

