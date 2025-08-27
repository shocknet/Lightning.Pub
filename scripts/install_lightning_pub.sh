#!/bin/bash

install_lightning_pub() {
  local REPO_URL="$1"
  local upgrade_status=0

  if [ -z "$REPO_URL" ]; then
    log "REPO_URL missing"
    return 1
  fi

  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
    USER_NAME=$SUDO_USER
  else
    USER_HOME=$HOME
    USER_NAME=$(whoami)
  fi

  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
  
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

  # Check if directory exists and is not empty to determine if it's an upgrade
  if [ -d "$USER_HOME/lightning_pub" ] && [ "$(ls -A $USER_HOME/lightning_pub)" ]; then
    log "Checking if Lightning.Pub update is needed..."
    
    # Check if update is needed by comparing commit hashes
    # Get latest commit hash from GitHub API
    API_RESPONSE=$(wget -qO- "https://api.github.com/repos/${REPO}/commits/${BRANCH}" 2>&1)
    echo "$API_RESPONSE" > /tmp/api_response.log

    # Check for a rate limit error first.
    if echo "$API_RESPONSE" | grep -q "API rate limit exceeded"; then
      log_error "GitHub API rate limit exceeded. Please wait a while before trying again." 1
    fi

    # Safely parse the JSON by finding the first "html_url" that contains "/commit/" and extracting the hash from it.
    LATEST_COMMIT=$(echo "$API_RESPONSE" | grep '"html_url":.*commit/' | head -n 1 | sed -n 's|.*commit/\([0-9a-f]\{40\}\).*|\1|p')
    
    # If we still couldn't get the commit, it's a different network or API error.
    if [ -z "$LATEST_COMMIT" ]; then
      log "GitHub API response was not as expected. Full response for debugging:"
      log "$API_RESPONSE"
      log_error "Could not retrieve latest version from GitHub. Upgrade check failed. Aborting." 1
    fi
    
    # Check if we have a stored commit hash and compare
    if [ -f "$USER_HOME/lightning_pub/.installed_commit" ]; then
        CURRENT_COMMIT=$(cat "$USER_HOME/lightning_pub/.installed_commit" 2>/dev/null | head -c 40)
        
        if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
          log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} is already at the latest commit. No update needed."
          rm -rf $USER_HOME/lightning_pub_temp
          return 2  # Special exit code to indicate no changes
        fi
      fi
    
    log "Upgrading existing Lightning.Pub installation..."
    upgrade_status=100  # Use 100 to indicate an upgrade
  else
    # If directory exists but is empty, remove it to ensure a clean 'mv'
    if [ -d "$USER_HOME/lightning_pub" ]; then
      rm -d "$USER_HOME/lightning_pub"
    fi
    log "Performing fresh Lightning.Pub installation..."
    upgrade_status=0
  fi

  # Merge if upgrade
  if [ $upgrade_status -eq 100 ]; then
    log "Backing up user data before upgrade..."
    BACKUP_DIR="$USER_HOME/lightning_pub_backup_$(date +%s)"
    mkdir -p "$BACKUP_DIR"

    # Move files and folders to preserve to the backup directory
    # Use 2>/dev/null to suppress errors if files don't exist
    mv "$USER_HOME/lightning_pub"/*.sqlite "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.env "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/logs "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.jwt_secret "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.wallet_secret "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/.installed_commit "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/admin.npub "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/app.nprofile "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/admin.connect "$BACKUP_DIR/" 2>/dev/null || true
    mv "$USER_HOME/lightning_pub"/admin.enroll "$BACKUP_DIR/" 2>/dev/null || true

    log "Replacing application files..."
    # Remove the old application directory (user data is now backed up)
    rm -rf "$USER_HOME/lightning_pub"
    # Move the new version into place
    mv "$USER_HOME/lightning_pub_temp" "$USER_HOME/lightning_pub"

    log "Restoring user data..."
    # Move the backed-up data into the new directory
    cp -r "$BACKUP_DIR"/* "$USER_HOME/lightning_pub/"
    
    # Clean up the backup directory
    rm -rf "$BACKUP_DIR"
  else
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
  if [ -n "$LATEST_COMMIT" ]; then
    echo "$LATEST_COMMIT" > "$USER_HOME/lightning_pub/.installed_commit"
  fi
  
  return 0 
}