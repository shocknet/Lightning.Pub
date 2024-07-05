#!/bin/bash

install_lightning_pub() {
  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  wget $REPO_URL -O lightning_pub.tar.gz > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to download Lightning.Pub.${RESET_COLOR}"
    exit 1
  }
  mkdir -p lightning_pub_temp
  tar -xvzf lightning_pub.tar.gz -C lightning_pub_temp --strip-components=1 > /dev/null 2>&1 || {
    log "${PRIMARY_COLOR}Failed to extract Lightning.Pub.${RESET_COLOR}"
    exit 1
  }
  rm lightning_pub.tar.gz

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

  # Merge if upgrade
  rsync -av --exclude='*.sqlite' --exclude='.env' --exclude='logs' --exclude='node_modules' lightning_pub_temp/ lightning_pub/ > /dev/null 2>&1
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

  log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} installation completed."
}