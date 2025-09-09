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
  for cmd in wget grep stat tar sha256sum; do
    if ! command -v $cmd &> /dev/null; then
      log "Missing system dependency: $cmd. Install $cmd via your package manager and retry."
      exit 1
    fi
  done
}