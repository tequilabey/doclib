#!/bin/bash
set -euo pipefail

SERVICE="doclib"

echo "=== Service status: $SERVICE ==="
echo

sudo systemctl status "$SERVICE" --no-pager

echo
echo "=== Recent logs ==="
sudo journalctl -u "$SERVICE" -n 30 --no-pager

