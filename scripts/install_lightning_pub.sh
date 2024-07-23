#!/bin/bash

install_lightning_pub() {
  local upgrade_status=0

  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
    USER_NAME=$SUDO_USER
  else
    USER_HOME=$HOME
    USER_NAME=$(whoami)
  fi

  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  
  sudo -u $USER_NAME wget -q $REPO_URL -O $USER_HOME/lightning_pub.tar.gz > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to download Lightning.Pub.${RESET_COLOR}"
    return 1
  }
  
  sudo -u $USER_NAME mkdir -p $USER_HOME/lightning_pub_temp
  sudo -u $USER_NAME tar -xzf $USER_HOME/lightning_pub.tar.gz -C $USER_HOME/lightning_pub_temp --strip-components=1 > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to extract Lightning.Pub.${RESET_COLOR}"
    return 1
  }
  rm $USER_HOME/lightning_pub.tar.gz

  if [ -d "$USER_HOME/lightning_pub" ]; then
    log "Upgrading existing Lightning.Pub installation..."
    upgrade_status=100  # Use 100 to indicate an upgrade
  else
    log "Performing fresh Lightning.Pub installation..."
    upgrade_status=0
  fi

  # Merge if upgrade
  if [ $upgrade_status -eq 100 ]; then
    rsync -a --quiet --exclude='*.sqlite' --exclude='.env' --exclude='logs' --exclude='node_modules' --exclude='.jwt_secret' --exclude='.wallet_secret' --exclude='admin.npub' --exclude='app.nprofile' --exclude='.admin_connect' --exclude='.admin_enroll' $USER_HOME/lightning_pub_temp/ $USER_HOME/lightning_pub/
  else
    mv $USER_HOME/lightning_pub_temp $USER_HOME/lightning_pub
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
    log "${PRIMARY_COLOR}Failed to install npm dependencies. Check npm_install.log for details.${RESET_COLOR}"
    return 1
  fi

  if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
    log "${PRIMARY_COLOR}npm install completed, but node_modules is empty or missing. Installation may have failed.${RESET_COLOR}"
    return 1
  fi

  log "npm dependencies installed successfully."
  
  # Echo a specific string followed by the upgrade status
  echo "UPGRADE_STATUS:$upgrade_status"
  return 0  # Always return 0 to indicate success
}