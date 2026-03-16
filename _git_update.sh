#!/bin/bash
set -euo pipefail

echo "Run started: $(date)"

APPID="doclib"
APPDIR="/opt/lodge/doclib"

echo "=== Document Library reset ==="

cd "$APPDIR"

if [ ! -d .git ]; then
  echo "Error: $APPDIR is not a git repository"
  exit 1
fi

BACKUP_DIR="$(mktemp -d /tmp/dl_backup.XXXXXX)"

cleanup() {
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

echo "Backing up local files..."

if [ -f .env ]; then
  cp .env "$BACKUP_DIR/"
fi

shopt -s nullglob
for f in _*.sh; do
  cp "$f" "$BACKUP_DIR/"
done
shopt -u nullglob

echo "Resetting repo..."
git reset --hard
git clean -fdx
git pull

echo "Restoring local files..."

if [ -f "$BACKUP_DIR/.env" ]; then
  mv "$BACKUP_DIR/.env" .
fi

shopt -s nullglob
for f in "$BACKUP_DIR"/_*.sh; do
  mv "$f" .
done
shopt -u nullglob

echo "Installing dependencies..."
rm -rf build .svelte-kit
npm install
npm run build

echo "Done."

