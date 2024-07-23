#!/bin/bash

install_lightning_pub() {
  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
    USER_NAME=$SUDO_USER
  else
    USER_HOME=$HOME
    USER_NAME=$(whoami)
  fi

  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  
  sudo -u $USER_NAME wget $REPO_URL -O $USER_HOME/lightning_pub.tar.gz > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to download Lightning.Pub.${RESET_COLOR}"
    exit 1
  }
  
  sudo -u $USER_NAME mkdir -p $USER_HOME/lightning_pub_temp
  sudo -u $USER_NAME tar -xvzf $USER_HOME/lightning_pub.tar.gz -C $USER_HOME/lightning_pub_temp --strip-components=1 > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to extract Lightning.Pub.${RESET_COLOR}"
    exit 1
  }
  rm $USER_HOME/lightning_pub.tar.gz

  if ! command -v rsync &> /dev/null; then
    log "${PRIMARY_COLOR}rsync not found, installing...${RESET_COLOR}"
    if [ "$OS" = "Mac" ]; then
      brew install rsync
    elif [ "$OS" = "Linux" ]; then
      if [ -x "$(command -v apt-get)" ]; then
        sudo apt-get update > /dev/null 2>&1
        sudo apt-get install -y rsync > /dev/null 2>&1
      elif [ -x "$(command -v yum)" ]; then
        sudo yum install -y rsync > /dev/null 2>&1
      else
        log "${PRIMARY_COLOR}Package manager not found. Please install rsync manually.${RESET_COLOR}"
        exit 1
      fi
    else
      log "${PRIMARY_COLOR}Package manager not found. Please install rsync manually.${RESET_COLOR}"
      exit 1
    fi
  fi

  if [ -d "$USER_HOME/lightning_pub" ]; then
    log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} is already installed. Upgrading..."
    PUB_UPGRADE=true
  else
    PUB_UPGRADE=false
  fi

  # Merge if upgrade
  rsync -av --exclude='*.sqlite' --exclude='.env' --exclude='logs' --exclude='node_modules' --exclude='.jwt_secret' --exclude='.wallet_secret' --exclude='admin.npub' --exclude='app.nprofile' --exclude='.admin_connect' --exclude='.admin_enroll' lightning_pub_temp/ lightning_pub/ > /dev/null 2>&1
  rm -rf lightning_pub_temp

  # Load nvm and npm
  export NVM_DIR="${NVM_DIR}"
  [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

  cd lightning_pub

  log "${PRIMARY_COLOR}Installing${RESET_COLOR} npm dependencies..."
  
  npm install > npm_install.log 2>&1 || {
    log "${PRIMARY_COLOR}Failed to install npm dependencies.${RESET_COLOR}"
    exit 1
  }

  if [ "$PUB_UPGRADE" = true ]; then
    PUB_UPGRADE_STATUS=1
  else
    PUB_UPGRADE_STATUS=0
  fi

  log "PUB_UPGRADE_STATUS set to $PUB_UPGRADE_STATUS"

  echo $PUB_UPGRADE_STATUS
}