#!/bin/bash

# Define theme colors
PRIMARY_COLOR="\e[38;5;208m"  # #f59322
SECONDARY_COLOR="\e[38;5;165m"  # #c740c7
RESET_COLOR="\e[0m"

# Log file
LOG_FILE="/var/log/deploy.log"

# Log function
log() {
  echo -e "$1" | tee $LOG_FILE
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
  LND_VERSION=$(wget -qO- https://api.github.com/repos/lightningnetwork/lnd/releases/latest | grep 'tag_name' | cut -d\" -f4)
  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${OS}-${ARCH}-${LND_VERSION}.tar.gz"

  # Check if LND is already installed
  if [ -d ~/lnd ]; then
    CURRENT_VERSION=$(~/lnd/lnd --version | grep -oP 'version \K[^\s]+')
    if [ "$CURRENT_VERSION" == "${LND_VERSION#v}" ]; then
      log "${SECONDARY_COLOR}LND${RESET_COLOR} is already up-to-date (version $CURRENT_VERSION)."
      return
    else
      if [ "$SKIP_PROMPT" != true ]; then
        read -p "LND version $CURRENT_VERSION is installed. Do you want to upgrade to version $LND_VERSION? (y/N): " response
        case "$response" in
          [yY][eE][sS]|[yY]) 
            log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
            ;;
          *)
            log "Upgrade cancelled."
            return
            ;;
        esac
      else
        log "${PRIMARY_COLOR}Upgrading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} from version $CURRENT_VERSION to $LND_VERSION..."
      fi
    fi
  fi

  log "${PRIMARY_COLOR}Downloading${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR}..."

  # Start the download
  wget -q $LND_URL -O lnd.tar.gz
  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to download ${SECONDARY_COLOR}LND${RESET_COLOR} binary. Please check the URL or your internet connection.${RESET_COLOR}"
    exit 1
  fi

  # Check if LND is already running and stop it if necessary
  if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
    if systemctl is-active --quiet lnd; then
      log "${PRIMARY_COLOR}Stopping${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
      sudo systemctl stop lnd
      if [ $? -ne 0 ]; then
        log "${PRIMARY_COLOR}Failed to stop ${SECONDARY_COLOR}LND${RESET_COLOR} service. Please stop it manually and try again.${RESET_COLOR}"
        exit 1
      fi
    fi
  else
    log "${PRIMARY_COLOR}systemctl not found. Please stop ${SECONDARY_COLOR}LND${RESET_COLOR} manually if it is running.${RESET_COLOR}"
  fi

  tar -xzf lnd.tar.gz -C ~/ > /dev/null
  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to extract ${SECONDARY_COLOR}LND${RESET_COLOR} binary.${RESET_COLOR}"
    exit 1
  fi
  rm lnd.tar.gz
  mv lnd-* lnd

  # Create .lnd directory if it doesn't exist
  mkdir -p ~/.lnd

  # Check if lnd.conf already exists and avoid overwriting it
  if [ -f ~/.lnd/lnd.conf ]; then
    log "${PRIMARY_COLOR}lnd.conf already exists. Skipping creation of new lnd.conf file.${RESET_COLOR}"
  else
    cat <<EOF > ~/.lnd/lnd.conf
bitcoin.mainnet=true
bitcoin.node=neutrino
neutrino.addpeer=neutrino.shock.network
feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
EOF
  fi

  log "${SECONDARY_COLOR}LND${RESET_COLOR} installation and configuration completed."
}

# Function to install Node.js using nvm
install_nodejs() {
  log "${PRIMARY_COLOR}Checking${RESET_COLOR} for Node.js..."
  MINIMUM_VERSION="18.0.0"
  
  # Load nvm if it exists
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  if ! command -v nvm &> /dev/null; then
    log "${PRIMARY_COLOR}nvm not found, installing...${RESET_COLOR}"
    NVM_VERSION=$(wget -qO- https://api.github.com/repos/nvm-sh/nvm/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash > /dev/null 2>&1
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    if [ "$(printf '%s\n' "$MINIMUM_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$MINIMUM_VERSION" ]; then
      log "${SECONDARY_COLOR}Node.js${RESET_COLOR} is already installed and meets the minimum version requirement."
      return
    else
      log "${PRIMARY_COLOR}Updating${RESET_COLOR} Node.js to the latest version..."
    fi
  else
    log "${PRIMARY_COLOR}Node.js is not installed. Installing the latest version...${RESET_COLOR}"
  fi

  nvm install node
  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to install Node.js. Please check the nvm installation.${RESET_COLOR}"
    exit 1
  fi

  log "${SECONDARY_COLOR}Node.js${RESET_COLOR} installation completed."
}

# Download and extract Lightning.Pub
install_lightning_pub() {
  log "${PRIMARY_COLOR}Installing${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  wget $REPO_URL -O lightning_pub.tar.gz > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to download ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} tarball. Please check the URL or your internet connection.${RESET_COLOR}"
    exit 1
  fi
  mkdir -p lightning_pub_temp
  tar -xvzf lightning_pub.tar.gz -C lightning_pub_temp --strip-components=1 > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed to extract ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} tarball.${RESET_COLOR}"
    exit 1
  fi
  rm lightning_pub.tar.gz

  # Check if rsync is installed, install if not
  if ! command -v rsync &> /dev/null; then
    log "${PRIMARY_COLOR}rsync not found, installing...${RESET_COLOR}"
    if [ -x "$(command -v apt-get)" ]; then
      sudo apt-get update > /dev/null 2>&1
      sudo apt-get install -y rsync > /dev/null 2>&1
    elif [ -x "$(command -v yum)" ]; then
      sudo yum install -y rsync > /dev/null 2>&1
    else
      log "${PRIMARY_COLOR}Package manager not found. Please install rsync manually.${RESET_COLOR}"
      exit 1
    fi
  fi

  # Merge if upgrade
  rsync -av --exclude='*.sqlite' --exclude='.env' --exclude='logs' --exclude='node_modules' lightning_pub_temp/ lightning_pub/ > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR}Failed${RESET_COLOR} to merge ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} files.${RESET_COLOR}"
    exit 1
  fi
  rm -rf lightning_pub_temp

  # Load nvm and npm
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  cd lightning_pub

  # Show a progress indicator while npm install is running
  log "${PRIMARY_COLOR}Installing${RESET_COLOR} npm dependencies..."
  
  npm install > npm_install.log 2>&1 &
  npm_pid=$!
  wait $npm_pid
  if [ $? -ne 0 ]; then
    log "${PRIMARY_COLOR} failed. Check npm_install.log for details.${RESET_COLOR}"
    exit 1
  fi

  log "${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} installation completed."
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
  echo -e "systemctl not available. Created start.sh. Please use this script to start the services manually."
}

# Start services
start_services() {
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

      echo -ne "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}LND${RESET_COLOR} service..."
      sudo systemctl start lnd &
      lnd_pid=$!
      wait $lnd_pid
      if systemctl is-active --quiet lnd; then
        echo -e "\n${SECONDARY_COLOR}LND${RESET_COLOR} started successfully using systemd."
      else
        echo -e "Failed to start ${SECONDARY_COLOR}LND${RESET_COLOR} using systemd."
        exit 1
      fi

      echo -e "Giving ${SECONDARY_COLOR}LND${RESET_COLOR} a few seconds to start before starting ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR}..."
      sleep 10

      echo -ne "${PRIMARY_COLOR}Starting${RESET_COLOR} ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} service..."
      sudo systemctl start lightning_pub &
      lightning_pub_pid=$!
      wait $lightning_pub_pid
      if systemctl is-active --quiet lightning_pub; then
        echo -e "\n${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} started successfully using systemd."
      else
        echo -e "Failed to start ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} using systemd."
        exit 1
      fi
    else
      create_start_script
      echo -e "systemctl not available. Created start.sh. Please use this script to start the services manually."
    fi
  elif [[ "$OS" == "Mac" ]]; then
    echo -e "macOS detected. Please configure launchd manually to start ${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} at startup."
    create_start_script
  elif [[ "$OS" == "Cygwin" || "$OS" == "MinGw" ]]; then
    echo -e "Windows detected. Please configure your startup scripts manually to start ${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} at startup."
    create_start_script
  else
    echo -e "Unsupported OS detected. Please configure your startup scripts manually."
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
  echo -e "${PRIMARY_COLOR}Please run as root or use sudo.${RESET_COLOR}"
  exit 1
fi

install_lnd
install_nodejs
install_lightning_pub
start_services
