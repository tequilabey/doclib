#!/bin/bash
set -euo pipefail

SERVICE="doclib"
APPDIR="/opt/lodge/doclib"

echo "=== Service reset: $SERVICE ==="

cd "$APPDIR"

echo "Stopping service..."
./_svc_stop.sh

echo "Installing systemd unit for $SERVICE..."
sudo cp "$APPDIR/_$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"

echo
echo "Installed unit:"
sudo systemctl cat "$SERVICE"

echo "Resetting repo via _git_update.sh..."
./_git_update.sh

echo "Reloading systemd configuration..."
sudo systemctl daemon-reload

echo "Starting service..."
./_svc_start.sh

echo
echo "Waiting for service to stabilize..."
sleep 2

echo
echo "Service status:"
sudo systemctl status "$SERVICE" --no-pager

echo
echo "Recent logs:"
sudo journalctl -u "$SERVICE" -n 30 --no-pager

echo
echo "=== Service reset complete ==="

