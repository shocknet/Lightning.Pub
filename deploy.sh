#!/bin/bash

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
  echo -n "Installing LND... "
  LND_VERSION=$(wget -qO- https://api.github.com/repos/lightningnetwork/lnd/releases/latest | grep 'tag_name' | cut -d\" -f4)
  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${OS}-${ARCH}-${LND_VERSION}.tar.gz"

  # Check if LND is already installed
  if [ -d ~/lnd ]; then
    echo "LND is already installed. Checking for updates..."
    CURRENT_VERSION=$(~/lnd/lnd --version | grep -oP 'version \K[^\s]+')
    if [ "$CURRENT_VERSION" == "$LND_VERSION" ]; then
      echo "LND is already up-to-date (version $CURRENT_VERSION)."
      return
    else
      if [ "$SKIP_PROMPT" != true ]; then
        read -p "LND version $CURRENT_VERSION is installed. Do you want to upgrade to version $LND_VERSION? (y/N): " response
        case "$response" in
          [yY][eE][sS]|[yY]) 
            echo "Upgrading LND from version $CURRENT_VERSION to $LND_VERSION..."
            ;;
          *)
            echo "Upgrade cancelled."
            return
            ;;
        esac
      else
        echo "Upgrading LND from version $CURRENT_VERSION to $LND_VERSION..."
      fi
    fi
  else
    echo "LND is not installed. Proceeding with installation..."
  fi

  wget $LND_URL -O lnd.tar.gz
  if [ $? -ne 0 ]; then
    echo "Failed to download LND binary. Please check the URL or your internet connection."
    exit 1
  fi

  # Check if LND is already running and stop it if necessary
  if [ "$SYSTEMCTL_AVAILABLE" = true ]; then
    if systemctl is-active --quiet lnd; then
      echo "LND is currently running. Stopping LND service..."
      sudo systemctl stop lnd
      if [ $? -ne 0 ]; then
        echo "Failed to stop LND service. Please stop it manually and try again."
        exit 1
      fi
    fi
  else
    echo "systemctl not found. Please stop LND manually if it is running."
  fi

  tar -xvzf lnd.tar.gz > /dev/null
  if [ $? -ne 0 ]; then
    echo "Failed to extract LND binary."
    exit 1
  fi
  rm lnd.tar.gz
  mv lnd-* lnd

  # Create .lnd directory if it doesn't exist
  mkdir -p ~/.lnd

  # Check if lnd.conf already exists and avoid overwriting it
  if [ -f ~/.lnd/lnd.conf ]; then
    echo "lnd.conf already exists. Skipping creation of new lnd.conf file."
  else
    cat <<EOF > ~/.lnd/lnd.conf
bitcoin.mainnet=true
bitcoin.node=neutrino
neutrino.addpeer=neutrino.shock.network
feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
noseedbackup=true
wallet-unlock-password-file=~/lnpass
wallet-unlock-allow-create=true
EOF
    echo "Created new lnd.conf file."
  fi

  echo "LND installation and configuration completed."
}

# Function to install Node.js using nvm
install_nodejs() {
  echo -n "Installing Node.js... "
  REQUIRED_VERSION="18.0.0"
  if ! command -v nvm &> /dev/null; then
    echo "nvm not found, installing..."
    NVM_VERSION=$(wget -qO- https://api.github.com/repos/nvm-sh/nvm/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  # Load nvm
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  nvm install $REQUIRED_VERSION
  nvm use $REQUIRED_VERSION
  nvm alias default $REQUIRED_VERSION

  NODE_VERSION=$(node -v | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
  if [ -z "$NODE_VERSION" ]; then
    echo "Failed to install Node.js. Please check the installation process."
    exit 1
  fi

  CURRENT_VERSION=$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | tail -n1)
  if [ "$CURRENT_VERSION" != "$NODE_VERSION" ]; then
    echo "NodeJS version is less than required, aborting"
    exit 1
  fi
  echo "Node.js installation completed."
}

# Download and extract Lightning.Pub
install_lightning_pub() {
  echo -n "Installing Lightning.Pub... "
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  wget $REPO_URL -O lightning_pub.tar.gz
  if [ $? -ne 0 ]; then
    echo "Failed to download Lightning.Pub tarball. Please check the URL or your internet connection."
    exit 1
  fi
  mkdir -p lightning_pub_temp
  tar -xvzf lightning_pub.tar.gz -C lightning_pub_temp --strip-components=1 > /dev/null
  if [ $? -ne 0 ]; then
    echo "Failed to extract Lightning.Pub tarball."
    exit 1
  fi
  rm lightning_pub.tar.gz

  # Check if rsync is installed, install if not
  if ! command -v rsync &> /dev/null; then
    echo "rsync not found, installing..."
    if [ -x "$(command -v apt-get)" ]; then
      sudo apt-get update
      sudo apt-get install -y rsync
    elif [ -x "$(command -v yum)" ]; then
      sudo yum install -y rsync
    else
      echo "Package manager not found. Please install rsync manually."
      exit 1
    fi
  fi

  # Merge if upgrade
  rsync -av --exclude='*.sqlite' --exclude='.env' --exclude='logs' --exclude='node_modules' lightning_pub_temp/ lightning_pub/ > /dev/null

  if [ $? -ne 0 ]; then
    echo "Failed to merge Lightning.Pub files."
    exit 1
  fi
  rm -rf lightning_pub_temp

  # Load nvm and npm
  export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  cd lightning_pub

  # Show a progress indicator while npm install is running
  echo -n "Installing npm dependencies... "
  npm install > npm_install.log 2>&1 &
  PID=$!
  while kill -0 $PID 2> /dev/null; do
    echo -n "."
    sleep 1
  done

  if wait $PID; then
    echo " done."
  else
    echo " failed. Check npm_install.log for details."
    exit 1
  fi

  echo "Lightning.Pub installation completed."
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
  echo "systemctl not available. Created start.sh. Please use this script to start the services manually."
}

display_starting_animation() {
  echo -n "Starting services"
  for i in {1..3}; do
    sleep 1
    echo -n "."
  done
  echo
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
Description=Lightning Pub Service
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

      sudo systemctl start lnd
      if systemctl is-active --quiet lnd; then
        echo "LND started successfully using systemd."
      else
        echo "Failed to start LND using systemd."
        exit 1
      fi

      # Give LND a few seconds to start before starting Lightning Pub
      sleep 10

      sudo systemctl start lightning_pub
      if systemctl is-active --quiet lightning_pub; then
        echo "Lightning Pub started successfully using systemd."
      else
        echo "Failed to start Lightning Pub using systemd."
        exit 1
      fi
    else
      create_start_script
      echo "systemctl not available. Created start.sh. Please use this script to start the services manually."
    fi
  elif [[ "$OS" == "Mac" ]]; then
    echo "macOS detected. Please configure launchd manually to start LND and Lightning Pub at startup."
    create_start_script
  elif [[ "$OS" == "Cygwin" || "$OS" == "MinGw" ]]; then
    echo "Windows detected. Please configure your startup scripts manually to start LND and Lightning Pub at startup."
    create_start_script
  else
    echo "Unsupported OS detected. Please configure your startup scripts manually."
    create_start_script
  fi

  display_starting_animation
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
  echo "Please run as root or use sudo."
  exit 1
fi

install_lnd
install_nodejs
install_lightning_pub
start_services