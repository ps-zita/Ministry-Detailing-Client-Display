#!/bin/bash

# This script runs the localtunnel command and monitors its output.
# If it detects "connection refused: localtunnel.me:22043", it restarts the tunnel.

# Function to run localtunnel command.
run_localtunnel() {
  echo "Starting localtunnel on $(date)..."
  lt --subdomain silent-papers-unite --port 3001 2>&1 | while IFS= read -r line; do
    echo "$line"
    # If the error message is detected in the output, break the loop.
    if echo "$line" | grep -q "connection refused: localtunnel.me:22043"; then
      echo "Error detected ($line). Restarting localtunnel..." 
      # Exit the while loop to trigger a restart.
      break
    fi
  done
}

# Main loop to continuously run and restart localtunnel.
while true; do
  run_localtunnel
  # You can adjust the sleep duration if needed.
  echo "Waiting 2 seconds before restarting..."
  sleep 2
done
