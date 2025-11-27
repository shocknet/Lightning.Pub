#!/bin/bash

install_nodejs() {
  USER_HOME=$HOME
  USER_NAME=$(whoami)

  export NVM_DIR="$USER_HOME/.nvm"
  log "${PRIMARY_COLOR}Checking${RESET_COLOR} for Node.js..."
  MINIMUM_VERSION="18.0.0"
  
  # Load nvm if it already exists
  export NVM_DIR="${NVM_DIR}"
  [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

  if ! command -v nvm &> /dev/null; then
    NVM_VERSION=$(get_latest_release_tag "nvm-sh/nvm")
    if [ -z "$NVM_VERSION" ]; then
      log "Failed to fetch latest NVM version."
      return 1
    fi
    log "Installing NVM ${NVM_VERSION}..."
    download_stdout "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash > /dev/null 2>&1
  fi

  # Source NVM
  export NVM_DIR="${NVM_DIR}"
  [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

  if ! command -v nvm &> /dev/null; then
    log "NVM installation failed."
    return 1
  fi

  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    if [ "$(printf '%s\n' "$MINIMUM_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$MINIMUM_VERSION" ]; then
      log "Node.js is already installed and meets the minimum version requirement."
      return 0
    else
      log "${PRIMARY_COLOR}Updating${RESET_COLOR} Node.js to the LTS version..."
    fi
  else
    log "Node.js is not installed. ${PRIMARY_COLOR}Installing the LTS version...${RESET_COLOR}"
  fi

  # Install Node.js LTS
  if ! nvm install --lts > /dev/null 2>&1; then
    log "${PRIMARY_COLOR}Failed to install Node.js.${RESET_COLOR}"
    return 1
  fi

  log "Node.js LTS installation completed."
  return 0
}