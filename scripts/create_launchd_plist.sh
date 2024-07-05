#!/bin/bash

create_launchd_plist() {
  create_plist() {
    local plist_path=$1
    local label=$2
    local program_args=$3
    local working_dir=$4

    if [ -f "$plist_path" ]; then
      log "${PRIMARY_COLOR}${label} already exists. Skipping creation.${RESET_COLOR}"
    else
      cat <<EOF > "$plist_path"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    ${program_args}
  </array>
  <key>WorkingDirectory</key>
  <string>${working_dir}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
EOF
    fi
  }
  USER_HOME=$(eval echo ~$(whoami))
  NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${USER_HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
  LAUNCH_AGENTS_DIR="${USER_HOME}/Library/LaunchAgents"

  create_plist "${LAUNCH_AGENTS_DIR}/local.lnd.plist" "local.lnd" "<string>${USER_HOME}/lnd/lnd</string>" ""
  create_plist "${LAUNCH_AGENTS_DIR}/local.lightning_pub.plist" "local.lightning_pub" "<string>/bin/bash</string><string>-c</string><string>source ${NVM_DIR}/nvm.sh && npm start</string>" "${USER_HOME}/lightning_pub"

  log "${PRIMARY_COLOR}Created launchd plists. Please load them using launchctl.${RESET_COLOR}"
}
