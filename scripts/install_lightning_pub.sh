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
  
  return 0 
}