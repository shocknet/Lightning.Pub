#!/bin/bash

start_services_mac() {
  create_launchd_plist
  launchctl load "${LAUNCH_AGENTS_DIR}/local.lnd.plist"
  launchctl load "${LAUNCH_AGENTS_DIR}/local.lightning_pub.plist"
  log "${SECONDARY_COLOR}LND${RESET_COLOR} and ${SECONDARY_COLOR}Lightning.Pub${RESET_COLOR} services started using launchd."
}

handle_macos() {
  check_homebrew
  install_rsync_mac
  install_nodejs
  install_lightning_pub
  create_launchd_plist
  start_services_mac
}
