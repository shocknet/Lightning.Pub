#!/bin/bash

install_lightning_pub() {
  local REPO_URL="$1"
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
      log "GitHub API response was not as expected. Full response for debugging:"
      log "$API_RESPONSE"
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

    log "Backing up user data before upgrade..."
    BACKUP_DIR="$USER_HOME/lightning_pub_backup_$(date +%s)"
    mkdir -p "$BACKUP_DIR"
    mv "$USER_HOME/lightning_pub"/*.sqlite "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.env "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/logs "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/metric_cache "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.jwt_secret "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.wallet_secret "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.installed_commit "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/admin.npub "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/app.nprofile "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/admin.connect "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/admin.enroll "$BACKUP_DIR/" 2>/dev/null || true

    log "Replacing application files..."
    rm -rf "$USER_HOME/lightning_pub"
    mv "$USER_HOME/lightning_pub_temp" "$USER_HOME/lightning_pub"

    log "Restoring user data..."
    if [ -n "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
      cp -r "$BACKUP_DIR"/* "$USER_HOME/lightning_pub/"
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
    fi
    rm -rf "$BACKUP_DIR"

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
  
  return $upgrade_status 
}