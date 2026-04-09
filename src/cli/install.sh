#!/bin/sh
set -e

EZBOT="${EZBOT:-CDN_PLACEHOLDER}"
INSTALL_DIR="$HOME/.ezbot"
BIN_DIR="$INSTALL_DIR/bin"

# --- Prereq checks ---
if ! command -v node > /dev/null 2>&1; then
  echo "Error: Node.js 20 or later is required. Install from https://nodejs.org" >&2
  exit 1
fi
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20 or later is required (found $(node --version))." >&2
  exit 1
fi
if ! command -v npm > /dev/null 2>&1; then
  echo "Error: npm is required but was not found." >&2
  exit 1
fi

echo "Installing ezbot CLI..."
mkdir -p "$INSTALL_DIR" "$BIN_DIR"

echo "Downloading CLI bundle..."
curl -fsSL "$EZBOT/cli.mjs" -o "$INSTALL_DIR/cli.mjs"

echo "Installing native serial port driver (this may take a moment)..."
printf '{"name":"ezbot-runtime","private":true,"dependencies":{"serialport":"^13.0.0"}}' \
  > "$INSTALL_DIR/package.json"
npm install --prefix "$INSTALL_DIR" --omit=dev --silent

# Launcher sets EZBOT_INSTALL_DIR so cli.js can offer to uninstall itself
cat > "$BIN_DIR/ezbot" << 'LAUNCHER'
#!/bin/sh
EZBOT_INSTALL_DIR="$HOME/.ezbot" exec node "$HOME/.ezbot/cli.mjs" "$@"
LAUNCHER
chmod +x "$BIN_DIR/ezbot"

echo ""
echo "Done! Launching ezbot..."
exec "$BIN_DIR/ezbot" < /dev/tty
