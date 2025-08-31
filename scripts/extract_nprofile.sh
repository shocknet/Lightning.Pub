#!/bin/bash

get_log_info() {
  USER_HOME=$HOME
  USER_NAME=$(whoami)

  LOG_DIR="$INSTALL_DIR/logs"
  DATA_DIR="$INSTALL_DIR/"
  START_TIME=$(date +%s)
  MAX_WAIT_TIME=360  # Maximum wait time in seconds (6 minutes)
  WAIT_INTERVAL=5    # Time to wait between checks in seconds

  TIMESTAMP_FILE="/tmp/pub_install_timestamp"
  # Get the modification time of the timestamp file as a UNIX timestamp
  ref_timestamp=$(stat -c %Y "$TIMESTAMP_FILE")

  # Wait for a new unlocker log file to be created
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    latest_unlocker_log=""
    # Loop through log files and check their modification time
    for log_file in "${LOG_DIR}/components/"unlocker_*.log; do
      if [ -f "$log_file" ]; then
        file_timestamp=$(stat -c %Y "$log_file")
        if [ "$file_timestamp" -gt "$ref_timestamp" ]; then
          latest_unlocker_log="$log_file"
          break # Found the newest log file
        fi
      fi
    done

    if [ -n "$latest_unlocker_log" ]; then
      break
    fi
    sleep $WAIT_INTERVAL
  done

  if [ -z "$latest_unlocker_log" ]; then
    log "Error: No new unlocker log file found after starting services. Please check the service status."
    exit 1
  fi

  # TODO: This wallet status polling is temporary; move to querying via the management port eventually.
  # Now that we have the correct log file, wait for the wallet status message
  START_TIME=$(date +%s)
  while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT_TIME ]; do
    latest_entry=$(grep -E "unlocker >> (the wallet is already unlocked|created wallet with pub:|unlocked wallet with pub)" "$latest_unlocker_log" | tail -n 1)

    # Show dynamic header sync progress if available from unlocker logs
    progress_line=$(grep -E "LND header sync [0-9]+% \(height=" "$latest_unlocker_log" | tail -n 1)
    if [ -n "$progress_line" ]; then
      percent=$(echo "$progress_line" | sed -E 's/.*LND header sync ([0-9]+)%.*/\1/')
      if [[ "$percent" =~ ^[0-9]+$ ]]; then
        bar_len=30
        filled=$((percent*bar_len/100))
        if [ $filled -gt $bar_len ]; then filled=$bar_len; fi
        empty=$((bar_len-filled))
        filled_bar=$(printf '%*s' "$filled" | tr ' ' '#')
        empty_bar=$(printf '%*s' "$empty" | tr ' ' ' ')
        echo -ne "Header sync: [${filled_bar}${empty_bar}] ${percent}%\r"
      fi
    fi
    if [ -n "$latest_entry" ]; then
      bar_len=30
      filled=$bar_len
      empty=0
      filled_bar=$(printf '%*s' "$filled" | tr ' ' '#')
      empty_bar=$(printf '%*s' "$empty" | tr ' ' ' ')
      echo -ne "Header sync: [${filled_bar}${empty_bar}] 100%\r"
      # End the progress line cleanly
      echo ""
      break
    fi
    sleep $WAIT_INTERVAL
  done

  log "Checking wallet status... This may take a moment."

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
        log "A node admin has not yet enrolled via Nostr."
        log "Paste this string into ShockWallet as a node source to connect as administrator:"
        log "${SECONDARY_COLOR}$admin_connect${RESET_COLOR}"
        break
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