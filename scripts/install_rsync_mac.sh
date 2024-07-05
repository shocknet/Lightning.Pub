#!/bin/bash

install_rsync_mac() {
  check_homebrew
  log "${PRIMARY_COLOR}Installing${RESET_COLOR} rsync using Homebrew..."
  brew install rsync || {
    log "${PRIMARY_COLOR}Failed to install rsync.${RESET_COLOR}"
    exit 1
  }
}
