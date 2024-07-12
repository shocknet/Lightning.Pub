#!/bin/bash

check_homebrew() {
  if ! command -v brew &> /dev/null; then
    log "${PRIMARY_COLOR}Homebrew not found. Installing Homebrew...${RESET_COLOR}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
      log "${PRIMARY_COLOR}Failed to install Homebrew.${RESET_COLOR}"
      exit 1
    }
  fi
}
