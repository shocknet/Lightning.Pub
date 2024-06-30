#!/bin/bash

# Function to detect OS and architecture
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
}

# Function to install LND
install_lnd() {
  LND_VERSION=$(wget -qO- https://api.github.com/repos/lightningnetwork/lnd/releases/latest | grep 'tag_name' | cut -d\" -f4)
  LND_URL="https://github.com/lightningnetwork/lnd/releases/download/${LND_VERSION}/lnd-${OS}-${ARCH}-${LND_VERSION}.tar.gz"
  wget $LND_URL -O lnd.tar.gz
  if [ $? -ne 0 ]; then
    echo "Failed to download LND binary. Please check the URL or your internet connection."
    exit 1
  fi
  tar -xvzf lnd.tar.gz
  if [ $? -ne 0 ]; then
    echo "Failed to extract LND binary."
    exit 1
  fi
  rm lnd.tar.gz
  mv lnd-* lnd

  # Create .lnd directory and lnd.conf file
  mkdir -p ~/.lnd
  cat <<EOF > ~/.lnd/lnd.conf
bitcoin.mainnet=true
bitcoin.node=neutrino
neutrino.addpeer=neutrino.shock.network
feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
noseedbackup=true
wallet-unlock-password-file=~/lnpass
wallet-unlock-allow-create=true
EOF
}

# Function to install Node.js using nvm
install_nodejs() {
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
}

# Function to download and extract Lightning.Pub tarball
install_lightning_pub() {
  REPO_URL="https://github.com/shocknet/Lightning.Pub/tarball/master"
  wget $REPO_URL -O lightning_pub.tar.gz
  if [ $? -ne 0 ]; then
    echo "Failed to download Lightning.Pub tarball. Please check the URL or your internet connection."
    exit 1
  fi
  mkdir lightning_pub
  tar -xvzf lightning_pub.tar.gz -C lightning_pub --strip-components=1
  if [ $? -ne 0 ]; then
    echo "Failed to extract Lightning.Pub tarball."
    exit 1
  fi
  rm lightning_pub.tar.gz
  cd lightning_pub
  npm install
  if [ $? -ne 0 ]; then
    echo "Failed to install npm dependencies."
    exit 1
  fi
}

# Function to create start script
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

# Function to display animated "starting..." log
display_starting_animation() {
  echo -n "Starting services"
  for i in {1..3}; do
    sleep 1
    echo -n "."
  done
  echo
}

# Function to start services
start_services() {
  ~/lnd/lnd &
  LND_PID=$!
  sleep 10
  npm start &
  NODE_PID=$!

  if [[ "$OS" == "Linux" ]]; then
    if [ -x "$(command -v systemctl)" ]; then
      sudo bash -c "cat > /etc/systemd/system/lnd.service <<EOF
[Unit]
Description=LND Service
After=network.target

[Service]
ExecStart=/home/$(whoami)/lnd/lnd
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
# Potential issue: Ensure the correct path to npm is used
ExecStart=$(which npm) start
WorkingDirectory=/home/$(whoami)/lightning_pub
User=$(whoami)
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

      sudo systemctl daemon-reload
      sudo systemctl enable lnd
      sudo systemctl enable lightning_pub
    else
      create_start_script
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

# Main script execution
detect_os_arch

# Potential issue: Ensure the script is run with sufficient privileges
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or use sudo."
  exit 1
fi

install_lnd
install_nodejs
install_lightning_pub
start_services
