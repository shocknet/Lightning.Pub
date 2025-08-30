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

  USER_HOME=$HOME
  USER_NAME=$(whoami)
  
  wget -q $REPO_URL -O $USER_HOME/lightning_pub.tar.gz > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to download Lightning.Pub.${RESET_COLOR}"
    return 1
  }
  
  mkdir -p $USER_HOME/lightning_pub_temp
  tar -xzf $USER_HOME/lightning_pub.tar.gz -C $USER_HOME/lightning_pub_temp --strip-components=1 > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to extract Lightning.Pub.${RESET_COLOR}"
    return 1
  }
  rm $USER_HOME/lightning_pub.tar.gz

  # Decide flow based on whether a valid previous installation exists.
  if [ -f "$USER_HOME/lightning_pub/.installed_commit" ] || [ -f "$USER_HOME/lightning_pub/db.sqlite" ]; then
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
    
    CURRENT_COMMIT=$(cat "$USER_HOME/lightning_pub/.installed_commit" 2>/dev/null | head -c 40)
    if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
      log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} is already at the latest commit. No update needed."
      rm -rf $USER_HOME/lightning_pub_temp
      return 2
    fi
    
    log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} installation..."
    upgrade_status=100

    # Stop the service if running to avoid rug-pull during backup and file replacement
    was_running=false
    if systemctl --user is-active --quiet lightning_pub 2>/dev/null; then
      log "Stopping Lightning.Pub service before upgrade..."
      systemctl --user stop lightning_pub
      was_running=true
    fi

    log "Backing up user data before upgrade..."
    BACKUP_DIR=$(mktemp -d)
    mv "$USER_HOME/lightning_pub" "$BACKUP_DIR"

    log "Replacing application files..."
    
    mv "$USER_HOME/lightning_pub_temp" "$USER_HOME/lightning_pub"

    log "Restoring user data..."
    cp "$BACKUP_DIR"/*.sqlite "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.env "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp -r "$BACKUP_DIR"/logs "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp -r "$BACKUP_DIR"/metric_cache "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.jwt_secret "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.wallet_secret "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/.installed_commit "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/admin.npub "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/app.nprofile "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/admin.connect "$USER_HOME/lightning_pub/" 2>/dev/null || true
    cp "$BACKUP_DIR"/admin.enroll "$USER_HOME/lightning_pub/" 2>/dev/null || true

    # Ensure correct ownership post-restore (fixes potential mismatches)
    chown -R "$USER_NAME:$USER_NAME" "$USER_HOME/lightning_pub/" 2>/dev/null || true
    # Secure DB files (as before)
    chmod 600 "$USER_HOME/lightning_pub/db.sqlite" 2>/dev/null || true
    chmod 600 "$USER_HOME/lightning_pub/metrics.sqlite" 2>/dev/null || true
    chmod 600 "$USER_HOME/lightning_pub/.jwt_secret" 2>/dev/null || true
    chmod 600 "$USER_HOME/lightning_pub/.wallet_secret" 2>/dev/null || true
    chmod 600 "$USER_HOME/lightning_pub/admin.connect" 2>/dev/null || true
    chmod 600 "$USER_HOME/lightning_pub/admin.enroll" 2>/dev/null || true
    # Ensure log/metric dirs are writable (dirs need execute for traversal)
    chmod 755 "$USER_HOME/lightning_pub/logs" 2>/dev/null || true
    chmod 755 "$USER_HOME/lightning_pub/logs/"*/ 2>/dev/null || true  # Subdirs like apps/
    chmod 755 "$USER_HOME/lightning_pub/metric_cache" 2>/dev/null || true

  elif [ -d "$USER_HOME/lightning_pub" ]; then
    # --- CONFLICT/UNSAFE PATH ---
    # This handles the case where the directory exists but is not a valid install (e.g., a git clone).
    log_error "Directory '~/lightning_pub' already exists but does not appear to be a valid installation. For your safety, please manually back up and remove this directory, then run the installer again." 1
  
  else
    # --- FRESH INSTALL PATH ---
    # This path is only taken if the ~/lightning_pub directory does not exist.
    log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
    upgrade_status=0
    mv "$USER_HOME/lightning_pub_temp" "$USER_HOME/lightning_pub"
  fi

  rm -rf $USER_HOME/lightning_pub_temp

  # Load nvm and npm
  export NVM_DIR="${NVM_DIR}"
  [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

  cd $USER_HOME/lightning_pub

  log "${PRIMARY_COLOR}Installing${RESET_COLOR} npm dependencies..."
  
  npm install > npm_install.log 2>&1
  npm_exit_code=$?

  if [ $npm_exit_code -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to install npm dependencies. Error details:${RESET_COLOR}"
    tail -n 20 npm_install.log | while IFS= read -r line; do
      log "  $line"
    done
    log "${PRIMARY_COLOR}Full log available in $USER_HOME/lightning_pub/npm_install.log${RESET_COLOR}"

    log "Restoring previous installation due to upgrade failure..."
    rm -rf "$USER_HOME/lightning_pub"
    mv "$BACKUP_DIR" "$USER_HOME/lightning_pub"  # Restore directly
    log "Backup remnant at $BACKUP_DIR for manual review but may auto-clean on reboot."

    if [ "$was_running" = true ]; then
      log "Restarting Lightning.Pub service after restore."
      systemctl --user start lightning_pub
    fi

    return 1
  fi
  
  # Store the commit hash for future update checks
  # Note: LATEST_COMMIT will be empty on a fresh install, which is fine.
  # The file will be created, and the next run will be an upgrade.
  if [ -n "$LATEST_COMMIT" ]; then
    echo "$LATEST_COMMIT" > "$USER_HOME/lightning_pub/.installed_commit"
  else
    touch "$USER_HOME/lightning_pub/.installed_commit"
  fi

  rm -rf "$BACKUP_DIR"
  
  return $upgrade_status 
}