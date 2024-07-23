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

  # Wait for wallet status in log file
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    latest_entry=$(grep -E "unlocker >> (macaroon not found, creating wallet|wallet is locked, unlocking|the wallet is already unlocked|created wallet with pub)" "$latest_unlocker_log" | tail -n 1)
    [ -n "$latest_entry" ] && break
    sleep $WAIT_INTERVAL
  done

  if [ -z "$latest_entry" ]; then
    log "Error: Failed to retrieve wallet status. Please check the service logs."
    exit 1
  fi

  log "Wallet status: $(echo "$latest_entry" | cut -d' ' -f4-)"

  # Find nprofile key
  MAX_ATTEMPTS=4
  ATTEMPT=0

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    LATEST_LOG=$(ls -1t ${LOG_DIR}/components/nostrMiddleware_*.log 2>/dev/null | head -n 1)
    if [ -n "$LATEST_LOG" ]; then
      latest_nprofile_key=$(grep -oP 'nprofile: \K\w+' "$LATEST_LOG" | tail -n 1)
      [ -n "$latest_nprofile_key" ] && break
    fi
    sleep 4
    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ -z "$latest_nprofile_key" ]; then
    log "Error: Failed to find nprofile key. Please check the service status."
    exit 1
  fi

  log "Paste this string into ShockWallet to connect to the node: $latest_nprofile_key"
}