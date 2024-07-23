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
  MAX_ATTEMPTS=4
  ATTEMPT=0

  find_latest_log() {
    ls -1t ${LOG_DIR}/components/nostrMiddleware_*.log 2>/dev/null | head -n 1
  }

  START_TIME=$(date +%s)

  latest_unlocker_log=$(ls -1t ${LOG_DIR}/components/unlocker_*.log 2>/dev/null | head -n 1)


  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    latest_entry=$(grep -E "unlocker >> macaroon not found, creating wallet|unlocker >> wallet is locked, unlocking|unlocker >> the wallet is already unlocked" "$latest_unlocker_log" | tail -n 1)
    
    if [ -n "$latest_entry" ]; then
      entry_time=$(date -d "$(echo "$latest_entry" | cut -d' ' -f1-2)" +%s)
      if [ "$entry_time" -ge "$START_TIME" ]; then
        log "Wallet status: $(echo "$latest_entry" | cut -d' ' -f4-)"
        break
      fi
    fi

    log "Awaiting latest unlocker status..."
    sleep 4
    ATTEMPT=$((ATTEMPT + 1))
  done

  ATTEMPT=0

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    LATEST_LOG=$(find_latest_log)
    if [ -n "$LATEST_LOG" ]; then
      latest_nprofile_key=$(grep -oP 'nprofile: \K\w+' "$LATEST_LOG" | tail -n 1)
      if [ -n "$latest_nprofile_key" ]; then
        break
      fi
    fi
    log "Awaiting connection details..."
    sleep 4
    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ -z "$latest_nprofile_key" ]; then
    log "Failed to find the log file, check service status"
    exit 1
  fi

  log "Paste this string into ShockWallet to connect to the node: $latest_nprofile_key"
}