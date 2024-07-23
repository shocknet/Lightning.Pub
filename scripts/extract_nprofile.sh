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
  
  # Wait for unlocker log file
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    latest_unlocker_log=$(ls -1t ${LOG_DIR}/components/unlocker_*.log 2>/dev/null | head -n 1)
    [ -n "$latest_unlocker_log" ] && break
    sleep $WAIT_INTERVAL
  done

  if [ -z "$latest_unlocker_log" ]; then
    log "Error: No unlocker log file found. Please check the service status."
    exit 1
  fi

  # Get the initial line count
  initial_lines=$(wc -l < "$latest_unlocker_log")

  # Wait for new wallet status in log file
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    current_lines=$(wc -l < "$latest_unlocker_log")
    if [ $current_lines -gt $initial_lines ]; then
      latest_entry=$(tail -n $((current_lines - initial_lines)) "$latest_unlocker_log" | grep "unlocker >>" | tail -n 1)
      if [ -n "$latest_entry" ]; then
        break
      fi
    fi
    sleep $WAIT_INTERVAL
  done

  if [ -z "$latest_entry" ]; then
    log "Error: Failed to retrieve wallet status. Please check the service logs."
    exit 1
  fi

  log "Wallet status: $(echo "$latest_entry" | cut -d' ' -f4-)"

  log "Retrieving connection information..."

  # Wait for either .admin_connect or app.nprofile to appear
  START_TIME=$(date +%s)
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    if [ -f "$DATA_DIR/.admin_connect" ]; then
      admin_connect=$(cat "$DATA_DIR/.admin_connect")
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
      log "Node is already set up. Use this nprofile to invite guestusers:"
      log "${SECONDARY_COLOR}$app_nprofile${RESET_COLOR}"
      break
    fi
    sleep $WAIT_INTERVAL
  done

  if [ ! -f "$DATA_DIR/.admin_connect" ] && [ ! -f "$DATA_DIR/app.nprofile" ]; then
    log "Error: Neither .admin_connect nor app.nprofile file found after waiting. Please check the service status."
    exit 1
  elif [ -f "$DATA_DIR/.admin_connect" ] && ! [[ $(cat "$DATA_DIR/.admin_connect") == nprofile1* ]] && ! [[ $(cat "$DATA_DIR/.admin_connect") == *:* ]]; then
    log "Error: Admin connect information is incomplete. Please check the service status."
    exit 1
  fi
}