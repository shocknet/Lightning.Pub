#!/bin/bash

install_lightning_pub() {
  local REPO_URL="$1"
  # Defined exit codes for this function:
  # 0: Fresh install success (triggers service start)
  # 100: Upgrade success (triggers service restart)
  # 2: No-op (already up-to-date, skip services)
  # Other: Error
  local upgrade_status=0

  if [ -z "$REPO_URL" ]; then
    log "REPO_URL missing"
    return 1
  fi

  local EXTRACT_DIR=$(mktemp -d)

  USER_HOME=$HOME
  USER_NAME=$(whoami)
  
  wget -q $REPO_URL -O $USER_HOME/lightning_pub.tar.gz > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to download Lightning.Pub.${RESET_COLOR}"
    return 1
  }
  
  tar -xzf $USER_HOME/lightning_pub.tar.gz -C "$EXTRACT_DIR" --strip-components=1 > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to extract Lightning.Pub.${RESET_COLOR}"
    rm -rf "$EXTRACT_DIR"
    return 1
  }
  rm $USER_HOME/lightning_pub.tar.gz

  # Decide flow based on whether a valid previous installation exists.
  if [ -f "$INSTALL_DIR/.installed_commit" ] || [ -f "$INSTALL_DIR/db.sqlite" ]; then
    # --- UPGRADE PATH ---
    log "Existing installation found. Checking for updates..."
    
    # Check if update is needed by comparing commit hashes
    API_RESPONSE=$(wget -qO- "https://api.github.com/repos/${REPO}/commits/${BRANCH}" 2>&1 | tee /tmp/api_response.log)
    if grep -q '"message"[[:space:]]*:[[:space:]]*"API rate limit exceeded"' <<< "$API_RESPONSE"; then
      log_error "GitHub API rate limit exceeded. Please wait a while before trying again." 1
    fi
    LATEST_COMMIT=$(echo "$API_RESPONSE" | awk -F'[/"]' '/"html_url": ".*\/commit\// {print $(NF-1); exit}')
    if [ -z "$LATEST_COMMIT" ]; then
      log_error "Could not retrieve latest version from GitHub. Upgrade check failed. Aborting." 1
    fi
    
    CURRENT_COMMIT=$(cat "$INSTALL_DIR/.installed_commit" 2>/dev/null | head -c 40)
    if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
      log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} is already at the latest commit. No update needed."
      rm -rf "$EXTRACT_DIR"
      return 2
    fi
    
    log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} installation..."
    upgrade_status=100

    # Stop the service if running to avoid rug-pull during backup and file replacement
    was_running=false
    if [ "$SYSTEMCTL_CMD" = "systemctl --user" ] && systemctl --user is-active --quiet lightning_pub 2>/dev/null; then
      log "Stopping Lightning.Pub service before upgrade..."
      systemctl --user stop lightning_pub
      was_running=true
    elif [ "$SYSTEMCTL_CMD" = "systemctl" ] && systemctl is-active --quiet lightning_pub 2>/dev/null; then
      log "Stopping Lightning.Pub service before upgrade..."
      systemctl stop lightning_pub
      was_running=true
    fi

    log "Backing up user data before upgrade..."
    BACKUP_DIR=$(mktemp -d)
    mv "$INSTALL_DIR" "$BACKUP_DIR"

    log "Installing latest version..."
    
    mv "$EXTRACT_DIR" "$INSTALL_DIR"

  elif [ -d "$INSTALL_DIR" ]; then
    # --- CONFLICT/UNSAFE PATH ---
    # This handles the case where the directory exists but is not a valid install (e.g., a git clone).
    log_error "Directory '$INSTALL_DIR' already exists but does not appear to be a valid installation. For your safety, please manually back up and remove this directory, then run the installer again." 1
  
  else
    # --- FRESH INSTALL PATH ---
    # This path is only taken if the ~/lightning_pub directory does not exist.
    log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
    upgrade_status=0
    mkdir -p "$(dirname "$INSTALL_DIR")"
    mv "$EXTRACT_DIR" "$INSTALL_DIR"
  fi


  # Load nvm and npm
  export NVM_DIR="${NVM_DIR}"
  [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

  cd "$INSTALL_DIR"

  log "${PRIMARY_COLOR}Installing${RESET_COLOR} npm dependencies..."
  
  npm install > npm_install.log 2>&1
  npm_exit_code=$?

  if [ $npm_exit_code -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to install npm dependencies. Error details:${RESET_COLOR}"
    tail -n 20 npm_install.log | while IFS= read -r line; do
      log "  $line"
    done
    log "${PRIMARY_COLOR}Full log available in $INSTALL_DIR/npm_install.log${RESET_COLOR}"

    log "Restoring previous installation due to upgrade failure..."
    rm -rf "$INSTALL_DIR"
    mv "$BACKUP_DIR" "$INSTALL_DIR"
    log "Backup remnant at $BACKUP_DIR for manual review but may auto-clean on reboot."

    if [ "$was_running" = true ]; then
      log "Restarting Lightning.Pub service after restore."
      $SYSTEMCTL_CMD start lightning_pub
    fi

    return 1
  fi

  if [ "$upgrade_status" -eq 100 ]; then
    # Restore user data AFTER successful NPM install
    log "Restoring user data..."
    cp "$BACKUP_DIR"/*.sqlite "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.env "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$BACKUP_DIR"/logs "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$BACKUP_DIR"/metric_cache "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.jwt_secret "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.wallet_secret "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.installed_commit "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/admin.npub "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/app.nprofile "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/admin.connect "$INSTALL_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR"/admin.enroll "$INSTALL_DIR/" 2>/dev/null || true

    # Ensure correct ownership post-restore (fixes potential mismatches)
    chown -R "$USER_NAME:$USER_NAME" "$INSTALL_DIR/" 2>/dev/null || true
    # Secure DB files (as before)
    chmod 600 "$INSTALL_DIR/db.sqlite" 2>/dev/null || true
    chmod 600 "$INSTALL_DIR/metrics.sqlite" 2>/dev/null || true
    chmod 600 "$INSTALL_DIR/.jwt_secret" 2>/dev/null || true
    chmod 600 "$INSTALL_DIR/.wallet_secret" 2>/dev/null || true
    chmod 600 "$INSTALL_DIR/admin.connect" 2>/dev/null || true
    chmod 600 "$INSTALL_DIR/admin.enroll" 2>/dev/null || true
    # Ensure log/metric dirs are writable (dirs need execute for traversal)
    chmod 755 "$INSTALL_DIR/logs" 2>/dev/null || true
    chmod 755 "$INSTALL_DIR/logs/"*/ 2>/dev/null || true  # Subdirs like apps/
    chmod 755 "$INSTALL_DIR/metric_cache" 2>/dev/null || true
  fi

  # Store the commit hash for future update checks
  # Note: LATEST_COMMIT will be empty on a fresh install, which is fine.
  # The file will be created, and the next run will be an upgrade.
  if [ -n "$LATEST_COMMIT" ]; then
    echo "$LATEST_COMMIT" > "$INSTALL_DIR/.installed_commit"
  else
    touch "$INSTALL_DIR/.installed_commit"
  fi

  rm -rf "$BACKUP_DIR" 2>/dev/null || true
  
  return $upgrade_status 
}