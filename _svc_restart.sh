#!/bin/bash
set -euo pipefail

SERVICE="doclib"

echo "=== Restarting: $SERVICE ==="
sudo systemctl restart "$SERVICE"

echo
sudo systemctl status "$SERVICE" --no-pager

