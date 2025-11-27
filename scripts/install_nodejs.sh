#!/bin/bash

install_nodejs() {
  USER_HOME=$HOME
  MINIMUM_VERSION="24.0.0"
  
  log "${PRIMARY_COLOR}Checking${RESET_COLOR} for Node.js..."

  if [ "$OS" = "Mac" ]; then
    install_nodejs_mac
  else
    install_nodejs_linux
  fi
}

install_nodejs_mac() {
  # Check if node exists and meets minimum version
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    if [ "$(printf '%s\n' "$MINIMUM_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$MINIMUM_VERSION" ]; then
      log "Node.js is already installed and meets the minimum version requirement."
      return 0
    fi
  fi

  log "Node.js is not installed or outdated. ${PRIMARY_COLOR}Installing...${RESET_COLOR}"

  # Get latest LTS version from Node.js
  local node_index=$(download_stdout "https://nodejs.org/dist/index.json")
  local lts_version=$(echo "$node_index" | grep -o '"version":"v[0-9.]*"[^}]*"lts":"[^"]*"' | grep -v '"lts":false' | awk -F'"' '{print $4; exit}')
  
  if [ -z "$lts_version" ]; then
    log "Failed to fetch Node.js LTS version."
    return 1
  fi
  
  log "Installing Node.js ${lts_version}..."
  
  local node_arch="x64"
  [ "$ARCH" = "arm64" ] && node_arch="arm64"
  
  local node_url="https://nodejs.org/dist/${lts_version}/node-${lts_version}-darwin-${node_arch}.tar.gz"
  local node_tar="$USER_HOME/node.tar.gz"
  
  download "$node_url" "$node_tar" || {
    log "Failed to download Node.js."
    return 1
  }
  
  # Extract to ~/node
  rm -rf "$USER_HOME/node"
  mkdir -p "$USER_HOME/node"
  tar -xzf "$node_tar" -C "$USER_HOME/node" --strip-components=1 || {
    log "Failed to extract Node.js."
    rm -f "$node_tar"
    return 1
  }
  rm -f "$node_tar"
  
  # Add to PATH for current session
  export PATH="$USER_HOME/node/bin:$PATH"
  
  # Add to shell profile if not already there
  local shell_profile="$USER_HOME/.zshrc"
  [ -f "$USER_HOME/.bash_profile" ] && shell_profile="$USER_HOME/.bash_profile"
  
  if ! grep -q 'node/bin' "$shell_profile" 2>/dev/null; then
    echo 'export PATH="$HOME/node/bin:$PATH"' >> "$shell_profile"
  fi
  
  log "Node.js ${lts_version} installation completed."
  return 0
}

install_nodejs_linux() {
  export NVM_DIR="$USER_HOME/.nvm"
  
  # Load nvm if it already exists
  [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

  if ! command -v nvm &> /dev/null; then
    NVM_VERSION=$(get_latest_release_tag "nvm-sh/nvm")
    if [ -z "$NVM_VERSION" ]; then
      log "Failed to fetch latest NVM version."
      return 1
    fi
    log "Installing NVM ${NVM_VERSION}..."
    download_stdout "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash > /dev/null 2>&1
    [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"
  fi

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

  if ! nvm install --lts > /dev/null 2>&1; then
    log "${PRIMARY_COLOR}Failed to install Node.js.${RESET_COLOR}"
    return 1
  fi

  log "Node.js LTS installation completed."
  return 0
}