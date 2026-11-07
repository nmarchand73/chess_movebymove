#!/usr/bin/env bash
# Build Move-by-Move and open it in the Electron (Chromium) shell with Web Bluetooth.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
DESKTOP="$ROOT/desktop"
PORT="${PORT:-4173}"

cd "$WEB"
echo "→ Building production bundle…"
npm run build

cd "$DESKTOP"
if [[ ! -d node_modules/electron ]]; then
  npm install
fi
bash "$ROOT/scripts/ensure-electron.sh"

rm -rf "$DESKTOP/www"
mkdir -p "$DESKTOP/www/chess_movebymove"
cp -R "$WEB/dist/." "$DESKTOP/www/chess_movebymove/"

if [[ ! -f "$DESKTOP/icon.png" ]]; then
  sips -s format png "$WEB/public/images/move-by-move-knight.png" --out "$DESKTOP/icon.png" >/dev/null
fi

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "→ Freeing port ${PORT}…"
  lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 0.3
fi

ELECTRON_BIN="$DESKTOP/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
echo "→ Opening Electron (Web Bluetooth)…"
export MOVE_BY_MOVE_PORT="$PORT"
exec "$ELECTRON_BIN" "$DESKTOP"
