#!/bin/bash

PRIMARY_COLOR="\e[38;5;208m"
SECONDARY_COLOR="\e[38;5;165m"
RESET_COLOR="\e[0m"

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
    arm64|aarch64|armv8*) ARCH=arm64;;
    armv7*)     ARCH=armv7;;
    *)          ARCH="UNKNOWN"
  esac

  if [ "$OS" = "Linux" ] && command -v systemctl &> /dev/null; then
    SYSTEMCTL_AVAILABLE=true
  else
    SYSTEMCTL_AVAILABLE=false
  fi
}

check_deps() {
  for cmd in grep stat tar; do
    if ! command -v $cmd &> /dev/null; then
      log "Missing system dependency: $cmd. Install $cmd via your package manager and retry."
      exit 1
    fi
  done

  # Check for wget or curl (one is required)
  if ! command -v wget &> /dev/null && ! command -v curl &> /dev/null; then
    log "Missing system dependency: wget or curl. Install via your package manager and retry."
    exit 1
  fi

  if ! command -v sha256sum &> /dev/null && ! command -v shasum &> /dev/null; then
    log "Missing system dependency: sha256sum or shasum."
    exit 1
  fi
}

# Cross-platform sed in-place
sed_i() {
  if [ "$OS" = "Mac" ]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Cross-platform mktemp with parent directory
mktemp_in() {
  local parent="$1"
  if [ "$OS" = "Mac" ]; then
    mktemp -d "${parent}/tmp.XXXXXX"
  else
    mktemp -d -p "$parent"
  fi
}

# Extract JSON value (cross-platform)
json_value() {
  local key="$1"
  if [ "$OS" = "Mac" ]; then
    echo "$2" | awk -F"\"${key}\"[[:space:]]*:[[:space:]]*\"" '{print $2}' | awk -F'"' '{print $1}' | head -1
  else
    echo "$2" | grep -oP "\"${key}\": \"\\K[^\"]+"
  fi
}

# Download file (wget or curl)
download() {
  local url="$1"
  local dest="$2"
  if command -v wget &> /dev/null; then
    wget -q "$url" -O "$dest"
  elif command -v curl &> /dev/null; then
    # -f: fail on HTTP errors (404/500)
    # -s: silent
    # -L: follow redirects
    curl -fsL "$url" -o "$dest"
  else
    log "Error: Neither wget nor curl found."
    return 1
  fi
}

# Download to stdout (wget or curl)
download_stdout() {
  local url="$1"
  if command -v wget &> /dev/null; then
    wget -qO- "$url"
  elif command -v curl &> /dev/null; then
    curl -fsL "$url"
  else
    log "Error: Neither wget nor curl found."
    return 1
  fi
}