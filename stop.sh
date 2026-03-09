#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found — is the server running?"
  exit 1
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Process $PID is not running — removing stale PID file"
  rm -f "$PID_FILE"
  exit 0
fi

kill "$PID"
rm -f "$PID_FILE"
echo "Server stopped (PID $PID)"
