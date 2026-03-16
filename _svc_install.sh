#!/bin/bash
set -euo pipefail

SERVICE="doclib"
APPDIR="/opt/lodge/doclib"

echo "Installing systemd unit for $SERVICE..."
sudo cp "$APPDIR/_$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"

echo
echo "Installed unit:"
sudo systemctl cat "$SERVICE"

