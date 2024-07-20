#!/bin/bash

PRIMARY_COLOR="\e[38;5;208m"
SECONDARY_COLOR="\e[38;5;165m"
RESET_COLOR="\e[0m"
LOG_FILE="/var/log/pubdeploy.log"

touch $LOG_FILE
chmod 644 $LOG_FILE

log() {
  local message="$(date '+%Y-%m-%d %H:%M:%S') $1"
  if [ -t 1 ]; then
    echo -e "$message"
  fi
  echo -e "$(echo $message | sed 's/\\e\[[0-9;]*m//g')" >> $LOG_FILE
}

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
    arm64)      ARCH=arm64;;
    *)          ARCH="UNKNOWN"
  esac

  if [ "$OS" = "Linux" ] && command -v systemctl &> /dev/null; then
    SYSTEMCTL_AVAILABLE=true
  else
    SYSTEMCTL_AVAILABLE=false
  fi
}
