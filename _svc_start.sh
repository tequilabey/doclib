#!/bin/bash
set -euo pipefail

SERVICE="doclib"

echo "=== Starting: $SERVICE ==="
sudo systemctl start "$SERVICE"

echo
sudo systemctl status "$SERVICE" --no-pager

