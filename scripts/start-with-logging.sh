#!/bin/bash
# Echo Rubicon Log Tracker
# Starts the application with comprehensive logging and automatic rotation

set -e

# Configuration
LOG_DIR="logs"
MAX_LOG_SIZE="10M"
KEEP_LOGS=5

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# Generate timestamp for log file
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="$LOG_DIR/echo_live_$TIMESTAMP.log"
LATEST_LOG="$LOG_DIR/echo_live.log"

echo -e "\033[32mStarting Echo Rubicon with logging...\033[0m"
echo -e "\033[36mLog file: $LOG_FILE\033[0m"
echo -e "\033[36mLatest log symlink: $LATEST_LOG\033[0m"

# Function to rotate logs
rotate_logs() {
    local log_dir="$1"
    local keep="$2"
    
    # Find and remove old log files, keeping only the most recent ones
    ls -t "$log_dir"/echo_live_*.log 2>/dev/null | tail -n +$((keep + 1)) | while read -r old_log; do
        echo -e "\033[33mRotating old log: $(basename "$old_log")\033[0m"
        rm -f "$old_log"
    done
}

# Rotate old logs
rotate_logs "$LOG_DIR" "$KEEP_LOGS"

# Create/update latest log symlink
ln -sf "$(basename "$LOG_FILE")" "$LATEST_LOG"

echo -e "\033[32mStarting npm start...\033[0m"
echo -e "\033[33mMonitoring logs in real-time. Press Ctrl+C to stop.\033[0m"
echo -e "\033[37m----------------------------------------\033[0m"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n\033[36mLog saved to: $LOG_FILE\033[0m"
    if [ -n "$NPM_PID" ] && kill -0 "$NPM_PID" 2>/dev/null; then
        echo -e "\033[33mTerminating npm process...\033[0m"
        kill "$NPM_PID" 2>/dev/null || true
        wait "$NPM_PID" 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start npm process in background and capture its PID
npm start 2>&1 | tee "$LOG_FILE" &
NPM_PID=$!

echo -e "\033[32mProcess started with PID: $NPM_PID\033[0m"

# Wait for the npm process to complete
wait "$NPM_PID"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n\033[32mProcess completed successfully\033[0m"
else
    echo -e "\n\033[31mProcess exited with code: $EXIT_CODE\033[0m"
fi

echo -e "\033[36mLog saved to: $LOG_FILE\033[0m"