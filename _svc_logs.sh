#!/bin/bash
set -euo pipefail

SERVICE="doclib"

LINES="${1:-50}"

echo "=== Following logs for: $SERVICE (last $LINES lines) ==="
echo "Press Ctrl+C to stop."
echo

sudo journalctl -u "$SERVICE" -n "$LINES" -f

