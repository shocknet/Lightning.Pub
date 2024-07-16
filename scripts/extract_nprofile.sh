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

  TIMEOUT=180
  while [ ! -f ${LOG_DIR}/components/unlocker_*.log ] && [ $TIMEOUT -gt 0 ]; do
    log "Waiting for build..."
    sleep 10
    TIMEOUT=$((TIMEOUT - 10))
  done
  if [ $TIMEOUT -le 0 ]; then
    log "Timeout waiting for unlocker log file."
    exit 1
  fi

  TIMEOUT=45
  while [ $TIMEOUT -gt 0 ]; do
    if grep -q -e "unlocker >> macaroon not found, creating wallet..." -e "unlocker >> the wallet is already unlocked" -e "unlocker >> wallet is locked, unlocking" ${LOG_DIR}/components/unlocker_*.log; then
      break
    fi
    sleep 1
    TIMEOUT=$((TIMEOUT - 1))
  done
  if [ $TIMEOUT -le 0 ]; then
    log "Timeout waiting for wallet status message."
    exit 1
  fi

  if grep -q "unlocker >> macaroon not found, creating wallet..." ${LOG_DIR}/components/unlocker_*.log; then
    log "Creating wallet..."
  elif grep -q "unlocker >> wallet is locked, unlocking" ${LOG_DIR}/components/unlocker_*.log; then
    log "Unlocking wallet..."
  else
    log "Wallet is already unlocked."
  fi

  log "Proceeding to nprofile attempts..."

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    LATEST_LOG=$(find_latest_log)
    if [ -n "$LATEST_LOG" ]; then
      log "Found latest log: $LATEST_LOG"
      break
    fi
    log "Awaiting nostr information..."
    sleep 4
    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ -z "$LATEST_LOG" ]; then
    log "Failed to find the log file, check service status"
    exit 1
  fi

  nprofile_key=$(grep -oP 'nprofile: \K\w+' "$LATEST_LOG")

  if [ -z "$nprofile_key" ]; then
    log "No nprofile key found in the log."
    exit 1
  fi

  log "Paste this string into ShockWallet to connect to the node: $nprofile_key"
}