#!/usr/bin/env bash
# Ensure desktop/node_modules/electron has a full Chromium binary (npm often skips postinstall).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_DIR="$ROOT/desktop/node_modules/electron"
DIST="$ELECTRON_DIR/dist"
APP="$DIST/Electron.app"
FRAMEWORK="$APP/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
BIN="$APP/Contents/MacOS/Electron"

if [[ ! -d "$ELECTRON_DIR" ]]; then
  (cd "$ROOT/desktop" && npm install)
fi

electron_ok() {
  [[ -x "$BIN" ]] || return 1
  [[ -f "$ELECTRON_DIR/path.txt" ]] || return 1
  [[ -f "$FRAMEWORK" ]] || return 1
  local fsize
  fsize="$(stat -f%z "$FRAMEWORK" 2>/dev/null || echo 0)"
  # Real Electron Framework is ~100MB+; stubs / failed extracts are tiny.
  [[ "$fsize" -gt 50000000 ]]
}

if electron_ok; then
  exit 0
fi

echo "→ Installing Electron binary…"
rm -rf "$DIST"
mkdir -p "$DIST"
cd "$ELECTRON_DIR"
ZIP="$(node -e "
  const {downloadArtifact}=require('@electron/get');
  const {version}=require('./package.json');
  downloadArtifact({version, artifactName:'electron', platform:process.platform, arch:process.arch})
    .then(p => process.stdout.write(p))
    .catch(e => { console.error(e); process.exit(1); });
")"
unzip -q "$ZIP" -d "$DIST"
printf '%s' 'Electron.app/Contents/MacOS/Electron' > path.txt
node -e "require('fs').writeFileSync('dist/version', require('./package.json').version)"

if ! electron_ok; then
  echo "Electron Framework missing or incomplete after unzip" >&2
  du -sh "$APP" 2>/dev/null || true
  exit 1
fi
echo "✓ Electron $(cat dist/version) ready ($(du -sh "$APP" | awk '{print $1}'))"
