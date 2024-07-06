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

  TIMEOUT=30
  while ! grep -q "rimraf build" <(tail -n 0 -F ${LOG_DIR}/components/nostrMiddleware_*.log) && [ $TIMEOUT -gt 0 ]; do
    sleep 1
    TIMEOUT=$((TIMEOUT - 1))
  done
  if [ $TIMEOUT -le 0 ]; then
    echo "Timeout waiting for 'rimraf build' message."
    exit 1
  fi
  echo "Running build..."

  TIMEOUT=45
  while ! grep -q -e "unlocker >> macaroon not found, creating wallet..." -e "unlocker >> the wallet is already unlocked" -e "unlocker >> wallet is locked, unlocking" <(tail -n 0 -F ${LOG_DIR}/components/nostrMiddleware_*.log) && [ $TIMEOUT -gt 0 ]; do
    sleep 1
    TIMEOUT=$((TIMEOUT - 1))
  done
  if [ $TIMEOUT -le 0 ]; then
    echo "Timeout waiting for wallet status message."
    exit 1
  fi

  if grep -q "unlocker >> macaroon not found, creating wallet..." <(tail -n 0 -F ${LOG_DIR}/components/nostrMiddleware_*.log); then
    echo "Creating wallet..."
  elif grep -q "unlocker >> wallet is locked, unlocking" <(tail -n 0 -F ${LOG_DIR}/components/nostrMiddleware_*.log); then
    echo "Unlocking wallet..."
  else
    echo "Wallet is already unlocked."
  fi

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    LATEST_LOG=$(find_latest_log)
    if [ -n "$LATEST_LOG" ]; then
      break
    fi
    echo "Awaiting nostr information..."
    sleep 4
    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ -z "$LATEST_LOG" ]; then
    echo "Failed to find the log file, check service status"
    exit 1
  fi

  nprofile_key=$(grep -oP 'nprofile: \K\w+' "$LATEST_LOG")

  if [ -z "$nprofile_key" ]; then
    echo "No nprofile key found in the log."
    exit 1
  fi

  # Print the extracted key
  echo "Paste this string into ShockWallet to connect to the node: $nprofile_key"
}