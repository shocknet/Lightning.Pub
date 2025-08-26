#!/bin/bash

get_log_info() {
  if [ "$EUID" -eq 0 ]; then
    USER_HOME=$(getent passwd ${SUDO_USER} | cut -d: -f6)
    USER_NAME=$SUDO_USER
  else
    USER_HOME=$HOME
    USER_NAME=$(whoami)
  fi

  LOG_DIR="$USER_HOME/lightning_pub/logs"
  DATA_DIR="$USER_HOME/lightning_pub/"
  START_TIME=$(date +%s)
  MAX_WAIT_TIME=120  # Maximum wait time in seconds
  WAIT_INTERVAL=5    # Time to wait between checks in seconds

  log "Checking wallet status... This may take a moment."
  
  TIMESTAMP_FILE="/tmp/pub_install_timestamp"

  # Wait for a new unlocker log file to be created
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    # Find a log file that is newer than our installation timestamp
    latest_unlocker_log=$(find "${LOG_DIR}/components/" -name "unlocker_*.log" -newer "$TIMESTAMP_FILE" -print0 2>/dev/null | xargs -0 ls -1t 2>/dev/null | head -n 1)
    if [ -n "$latest_unlocker_log" ]; then
      break
    fi
    sleep $WAIT_INTERVAL
  done

  if [ -z "$latest_unlocker_log" ]; then
    log "Error: No new unlocker log file found after starting services. Please check the service status."
    exit 1
  fi

  # Now that we have the correct log file, wait for the wallet status message
  START_TIME=$(date +%s)
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    latest_entry=$(grep -E "unlocker >> (the wallet is already unlocked|created wallet with pub:|unlocked wallet with pub)" "$latest_unlocker_log" | tail -n 1)
    if [ -n "$latest_entry" ]; then
      break
    fi
    sleep $WAIT_INTERVAL
  done

  if [ -z "$latest_entry" ]; then
    log "Can't retrieve wallet status, check the service logs."
    exit 1
  fi

  if [[ "$latest_entry" == *"the wallet is already unlocked"* ]]; then
    log "Wallet status: The wallet is already unlocked"
  elif [[ "$latest_entry" == *"created wallet with pub"* ]]; then
    log "Wallet status: A new wallet has been created"
  elif [[ "$latest_entry" == *"unlocking"* ]]; then
    log "Wallet status: The wallet is in the process of unlocking"
  elif [[ "$latest_entry" == *"unlocked wallet with pub"* ]]; then
    log "Wallet status: The wallet has been successfully unlocked"
  else
    log "Wallet status: Unknown (unexpected status message)"
  fi

  log "Retrieving connection information..."

  # Wait for either admin.connect or app.nprofile to appear
  START_TIME=$(date +%s)
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    if [ -f "$DATA_DIR/admin.connect" ]; then
      admin_connect=$(cat "$DATA_DIR/admin.connect")
      # Check if the admin_connect string is complete (contains both nprofile and secret)
      if [[ $admin_connect == nprofile* ]] && [[ $admin_connect == *:* ]]; then
        log "An admin has not yet been enrolled."
        log "Paste this string into ShockWallet to administer the node:"
        log "${SECONDARY_COLOR}$admin_connect${RESET_COLOR}"
        break
      else
        log "Waiting for complete admin connect information..."
      fi
    elif [ -f "$DATA_DIR/app.nprofile" ]; then
      app_nprofile=$(cat "$DATA_DIR/app.nprofile")
      log "Node is already set up. Use this nprofile to invite guest users:"
      log "${SECONDARY_COLOR}$app_nprofile${RESET_COLOR}"
      break
    fi
    sleep $WAIT_INTERVAL
  done

  if [ ! -f "$DATA_DIR/admin.connect" ] && [ ! -f "$DATA_DIR/app.nprofile" ]; then
    log "Neither admin.connect nor app.nprofile file found after waiting. Please check the service status."
    exit 1
  elif [ -f "$DATA_DIR/admin.connect" ] && ! [[ $(cat "$DATA_DIR/admin.connect") == nprofile1* ]] && ! [[ $(cat "$DATA_DIR/admin.connect") == *:* ]]; then
    log "Admin connect information is incomplete. Please check the service status."
    exit 1
  fi
}