#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".pid"
LOG_FILE="server.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Server is already running (PID $(cat "$PID_FILE"))"
  exit 1
fi

echo "Building..."
npm run build

echo "Starting server..."
nohup node dist/server.js > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "Server started (PID $(cat "$PID_FILE")) — logs: $LOG_FILE"
