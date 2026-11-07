#!/usr/bin/env bash
# Package Move-by-Move as a macOS .app with embedded Chromium (Electron) + Web Bluetooth.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
DESKTOP="$ROOT/desktop"
APP_NAME="Move by Move"
APP_DIR="${1:-$HOME/Applications/$APP_NAME.app}"
ICON_SRC="$WEB/public/images/move-by-move-knight.png"
ELECTRON_DIST="$DESKTOP/node_modules/electron/dist"

echo "→ Building production bundle…"
cd "$WEB"
npm run build

echo "→ Preparing desktop shell…"
cd "$DESKTOP"
if [[ ! -d node_modules/electron ]]; then
  npm install
fi
bash "$ROOT/scripts/ensure-electron.sh"

rm -rf "$DESKTOP/www"
mkdir -p "$DESKTOP/www/chess_movebymove"
cp -R "$WEB/dist/." "$DESKTOP/www/chess_movebymove/"

TMP_ICON="$(mktemp -d)"
ICONSET="$TMP_ICON/AppIcon.iconset"
mkdir -p "$ICONSET"
BASE_PNG="$TMP_ICON/base.png"
sips -s format png "$ICON_SRC" --out "$BASE_PNG" >/dev/null
cp "$BASE_PNG" "$DESKTOP/icon.png"
declare -a SIZES=(16 32 128 256 512)
for size in "${SIZES[@]}"; do
  sips -z "$size" "$size" "$BASE_PNG" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$BASE_PNG" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$DESKTOP/icon.icns"
rm -rf "$TMP_ICON"

echo "→ Assembling $APP_DIR (Electron + Web Bluetooth)…"
rm -rf "$APP_DIR"
mkdir -p "$(dirname "$APP_DIR")"
cp -R "$ELECTRON_DIST/Electron.app" "$APP_DIR"

RESOURCES="$APP_DIR/Contents/Resources"
PLIST="$APP_DIR/Contents/Info.plist"

rm -rf "$RESOURCES/default_app.asar" "$RESOURCES/app" "$RESOURCES/www"
mkdir -p "$RESOURCES/app"
cp "$DESKTOP/main.mjs" "$DESKTOP/package.json" "$RESOURCES/app/"
cp -R "$DESKTOP/www" "$RESOURCES/www"
cp "$DESKTOP/icon.icns" "$RESOURCES/electron.icns"
cp "$DESKTOP/icon.png" "$RESOURCES/app/icon.png"

/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleName string $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.movebymove.coach.local" "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.movebymove.coach.local" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 0.1.0" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile electron.icns" "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string electron.icns" "$PLIST"

MSG="Move by Move utilise le Bluetooth pour se connecter aux échiquiers Chessnut et ChessUp."
for key in NSBluetoothAlwaysUsageDescription NSBluetoothPeripheralUsageDescription; do
  /usr/libexec/PlistBuddy -c "Add :$key string $MSG" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :$key $MSG" "$PLIST"
done

xattr -dr com.apple.quarantine "$APP_DIR" 2>/dev/null || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_DIR" >/dev/null 2>&1 || true

echo "✓ Packaged: $APP_DIR"
echo "  Chromium intégré · Web Bluetooth Chessnut / ChessUp"
echo "  open \"$APP_DIR\""
