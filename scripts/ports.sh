#!/bin/bash

# --- Port Management ---

# Finds an available TCP port, starting from a given base port.
# If the base port is in use, it increments until a free port is found.
#
# @param base_port The starting port number.
# @return The first available port number.
find_available_port() {
  local port=$1
  while ! is_port_available "$port"; do
    log "Port $port is in use. Checking next port..." >&2
    port=$((port + 1))
  done
  echo "$port"
}

# Checks if a given TCP port is available.
#
# @param port The port number to check.
# @return 0 if the port is available, 1 otherwise.
is_port_available() {
  local port=$1
  ! lsof -iTCP:"$port" -sTCP:LISTEN -P -t >/dev/null 2>&1
}
