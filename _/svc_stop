#!/bin/bash
set -euo pipefail

SERVICE="doclib"

echo "=== Stopping: $SERVICE ==="
sudo systemctl stop "$SERVICE"

echo
sudo systemctl status "$SERVICE" --no-pager || true

