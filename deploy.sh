#!/bin/bash

# Define theme colors
PRIMARY_COLOR="\e[38;5;208m"  # #f59322
SECONDARY_COLOR="\e[38;5;165m"  # #c740c7
RESET_COLOR="\e[0m"

# Log file
LOG_FILE="/var/log/deploy.log"

# Log function
log() {
  echo -e "$1" | tee -a $LOG_FILE
}

# Detect OS and architecture
detect_os_arch() {
  OS="$(uname -s)"
  ARCH="$(uname -m)"
  case "$OS" in
    Linux*)     OS=Linux;;
    Darwin*)    OS=Mac;;
    CYGWIN*)    OS=Cygwin;;
    MINGW*)     OS=MinGw;;
    *)          OS="UNKNOWN"
  esac
  case "$ARCH" in
    x86_64)     ARCH=amd64;;
    armv7l)     ARCH=armv7;;
    arm64)      ARCH=arm64;;
    *)          ARCH="UNKNOWN"
  esac

  # Check if systemctl is available
  if command -v systemctl &> /dev/null; then
    SYSTEMCTL_AVAILABLE=true
  else
    SYSTEMCTL_AVAILABLE=false
  fi
}

# Install LND
install_lnd() {
  log "${PRIMARY_COLOR}Installing LND...${RESET_COLOR}"
  LND_VERSION=$(wget -qO- https://api.github.com/repos/lightningnetwork/lnd/releases/latest | grep 'tag_name' | cut -d\" -f4)
  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${OS}-${ARCH}-${LND_VERSION}.tar.gz"

  # Check if LND is already installed
  if [ -d ~/lnd ]; then
    CURRENT_VERSION=$(~/lnd/lnd --version | grep -oP 'version \K[^\s]+')
    if [ "$CURRENT_VERSION" == "${LND_VERSION#v}" ]; then
      log "${SECONDARY_COLOR}LND is already up-to-date (version $CURRENT_VERSION).${RESET_COLOR}"
      return
    else
      if [ "$SKIP_PROMPT" != true ]; then
        read -p "LND version $CURRENT_VERSION is installed. Do you want to upgrade to version $LND_VERSION? (y/N): " response
        case "$response" in
          [yY][eE][sS]|[yY]) 
            log "${PRIMARY_COLOR}Upgrading LND from version $CURRENT_VERSION to $LND_VERSION...${RESET_COLOR}"
            ;;
          *)
            log "${SECONDARY_COLOR}Upgrade cancelled.${RESET_COLOR}"
            return
            ;;
        esac
      else
        log "${PRIMARY_COLOR}Upgrading LND from version $CURRENT_VERSION to $LND_VERSION...${RESET_COLOR}"
      fi
    fi
  fi

  log "${PRIMARY_COLOR}Downloading LND...${RESET_COLOR}"
  wget --progress=dot:giga $LND_URL -O lnd.tar.gz 2>&1 | grep --line-buffered "%" | sed -u -e "s,\.,,g" | awk '{printf("\rDownloading: %s", $2)}'
  echo -e "\n"

  if [ $? -ne 0 ]; then
    log "${SECONDARY_COLOR}Failed to download LND binary. Please check the URL or your internet connection.${RESET_COLOR}"
    exit 1
  fi

  # Check if LND is already running and stop it if necessary
  if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
    if systemctl is-active --quiet lnd; then
      log "${PRIMARY_COLOR}Stopping LND service...${RESET_COLOR}"
      sudo systemctl stop lnd
      if [ $? -ne 0 ]; then
        log "${SECONDARY_COLOR}Failed to stop LND service. Please stop it manually and try again.${RESET_COLOR}"
        exit 1
      fi
    fi
  else
    log "${SECONDARY_COLOR}systemctl not found. Please stop LND manually if it is running.${RESET_COLOR}"
  fi

  tar -xzf lnd.tar.gz -C ~/ > /dev/null
  if [ $? -ne 0 ]; then
    log "${SECONDARY_COLOR}Failed to extract LND binary.${RESET_COLOR}"
    exit 1
  fi
  rm lnd.tar.gz
  mv lnd-* lnd

  # Create .lnd directory if it doesn't exist
  mkdir -p ~/.lnd

  # Check if lnd.conf already exists and avoid overwriting it
  if [ -f ~/.lnd/lnd.conf ]; then
    log "${SECONDARY_COLOR}lnd.conf already exists. Skipping creation of new lnd.conf file.${RESET_COLOR}"
  else
    cat <<EOF > ~/.lnd/lnd.conf
bitcoin.mainnet=true
bitcoin.node=neutrino
neutrino.addpeer=neutrino.shock.network
feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
EOF
    log "${PRIMARY_COLOR}Created new lnd.conf file.${RESET_COLOR}"
  fi

  log "${PRIMARY_COLOR}LND installation and configuration completed.${RESET_COLOR}"
}

# Function to install Node.js using nvm
install_nodejs() {
  log "${PRIMARY_COLOR}Checking for Node.js...${RESET_COLOR}"
  MINIMUM_VERSION="18.0.0"
  
  # Load nvm if it exists
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  if ! command -v nvm &> /dev/null; then
    log "${SECONDARY_COLOR}nvm not found, installing...${RESET_COLOR}"
    NVM_VERSION=$(wget -qO- https://api.github.com/repos/nvm-sh/nvm/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash > /dev/null 2>&1
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    if [ "$(printf '%s\n' "$MINIMUM_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$MINIMUM_VERSION" ]; then
      log "${SECONDARY_COLOR}Node.js is already installed and meets the minimum version requirement.${RESET_COLOR}"
      return
    else
      log "${PRIMARY_COLOR}Updating Node.js to the latest version...${RESET_COLOR}"
    fi
  else
    log "${PRIMARY_COLOR}Node.js is not installed. Installing the latest version...${RESET_COLOR}"
  fi

  nvm install node
  if [ $? -ne 0 ]; then
    log "${SECONDARY_COLOR}Failed to install Node.js. Please check the nvm installation.${RESET_COLOR}"
    exit 1
  fi

  log "${PRIMARY_COLOR}Node.js installation completed.${RESET_COLOR}"
}

# Download and extract Lightning.Pub
install_lightning_pub() {
  log "${PRIMARY_COLOR}Installing Lightning.Pub...${RESET_COLOR}"
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  wget $REPO_URL -O lightning_pub.tar.gz > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log "${SECONDARY_COLOR}Failed to download Lightning.Pub tarball. Please check the URL or your internet connection.${RESET_COLOR}"
    exit 1
  fi
  mkdir -p lightning_pub_temp
  tar -xvzf lightning_pub.tar.gz -C lightning_pub_temp --strip-components=1 > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log "${SECONDARY_COLOR}Failed to extract Lightning.Pub tarball.${RESET_COLOR}"
    exit 1
  fi
  rm lightning_pub.tar.gz

  # Check if rsync is installed, install if not
  if ! command -v rsync &> /dev/null; then
    log "${SECONDARY_COLOR}rsync not found, installing...${RESET_COLOR}"
    if [ -x "$(command -v apt-get)" ]; then
      sudo apt-get update > /dev/null 2>&1
      sudo apt-get install -y rsync > /dev/null 2>&1
    elif [ -x "$(command -v yum)" ]; then
      sudo yum install -y rsync > /dev/null 2>&1
    else
      log "${SECONDARY_COLOR}Package manager not found. Please install rsync manually.${RESET_COLOR}"
      exit 1
    fi
  fi

  # Merge if upgrade
  rsync -av --exclude='*.sqlite' --exclude='.env' --exclude='logs' --exclude='node_modules' lightning_pub_temp/ lightning_pub/ > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    log "${SECONDARY_COLOR}Failed to merge Lightning.Pub files.${RESET_COLOR}"
    exit 1
  fi
  rm -rf lightning_pub_temp

  # Load nvm and npm
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  cd lightning_pub

  # Show a progress indicator while npm install is running
  log "${PRIMARY_COLOR}Installing npm dependencies...${RESET_COLOR}"
  npm install > npm_install.log 2>&1 &
  PID=$!
  while kill -0 $PID 2> /dev/null; do
    log "${SECONDARY_COLOR}.${RESET_COLOR}"
    sleep 1
  done

  if wait $PID; then
    log "${PRIMARY_COLOR} done.${RESET_COLOR}"
  else
    log "${SECONDARY_COLOR} failed. Check npm_install.log for details.${RESET_COLOR}"
    exit 1
  fi

  log "${PRIMARY_COLOR}Lightning.Pub installation completed.${RESET_COLOR}"
}

# Ceate start script
create_start_script() {
  cat <<EOF > start.sh
#!/bin/bash
~/lnd/lnd &
LND_PID=\$!
sleep 10
npm start &
NODE_PID=\$!
wait \$LND_PID
wait \$NODE_PID
EOF
  chmod +x start.sh
  echo -e "${SECONDARY_COLOR}systemctl not available. Created start.sh. Please use this script to start the services manually.${RESET_COLOR}"
}

display_starting_animation() {
  echo -e "${PRIMARY_COLOR}Starting services${RESET_COLOR}"
  for i in {1..3}; do
    sleep 1
    echo -e "${SECONDARY_COLOR}.${RESET_COLOR}"
  done
  echo -e "${RESET_COLOR}"
}

# Start services
start_services() {
  display_starting_animation
  USER_HOME=$(eval echo ~$(whoami))
  if [[ "$OS" == "Linux" ]]; then
    if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
      sudo bash -c "cat > /etc/systemd/system/lnd.service <<EOF
[Unit]
Description=LND Service
After=network.target

[Service]
ExecStart=${USER_HOME}/lnd/lnd
User=$(whoami)
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

      sudo bash -c "cat > /etc/systemd/system/lightning_pub.service <<EOF
[Unit]
Description=Lightning.Pub Service
After=network.target

[Service]
ExecStart=/bin/bash -c 'source ${USER_HOME}/.nvm/nvm.sh && npm start'
WorkingDirectory=${USER_HOME}/lightning_pub
User=$(whoami)
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

      sudo systemctl daemon-reload
      sudo systemctl enable lnd
      sudo systemctl enable lightning_pub

      echo -e "${PRIMARY_COLOR}Starting services${RESET_COLOR}"
      sudo systemctl start lnd
      if systemctl is-active --quiet lnd; then
        echo -e "${PRIMARY_COLOR}LND started successfully using systemd.${RESET_COLOR}"
      else
        echo -e "${SECONDARY_COLOR}Failed to start LND using systemd.${RESET_COLOR}"
        exit 1
      fi

      echo -e "${PRIMARY_COLOR}Giving LND a few seconds to start before starting Lightning.Pub...${RESET_COLOR}"
      sleep 10

      sudo systemctl start lightning_pub
      if systemctl is-active --quiet lightning_pub; then
        echo -e "${PRIMARY_COLOR}Lightning.Pub started successfully using systemd.${RESET_COLOR}"
      else
        echo -e "${SECONDARY_COLOR}Failed to start Lightning.Pub using systemd.${RESET_COLOR}"
        exit 1
      fi
    else
      create_start_script
      echo -e "${SECONDARY_COLOR}systemctl not available. Created start.sh. Please use this script to start the services manually.${RESET_COLOR}"
    fi
  elif [[ "$OS" == "Mac" ]]; then
    echo -e "${SECONDARY_COLOR}macOS detected. Please configure launchd manually to start LND and Lightning.Pub at startup.${RESET_COLOR}"
    create_start_script
  elif [[ "$OS" == "Cygwin" || "$OS" == "MinGw" ]]; then
    echo -e "${SECONDARY_COLOR}Windows detected. Please configure your startup scripts manually to start LND and Lightning.Pub at startup.${RESET_COLOR}"
    create_start_script
  else
    echo -e "${SECONDARY_COLOR}Unsupported OS detected. Please configure your startup scripts manually.${RESET_COLOR}"
    create_start_script
  fi

}

# Upgrade flag
SKIP_PROMPT=false
for arg in "$@"; do
  case $arg in
    --yes)
    SKIP_PROMPT=true
    shift
    ;;
  esac
done

detect_os_arch

# Ensure the script is run with sufficient privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${SECONDARY_COLOR}Please run as root or use sudo.${RESET_COLOR}"
  exit 1
fi

install_lnd
install_nodejs
install_lightning_pub
start_services
