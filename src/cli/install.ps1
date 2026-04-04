$ErrorActionPreference = "Stop"
$EZBOT = if ($env:EZBOT) { $env:EZBOT } else { "https://YOUR_CDN_URL" }
$INSTALL_DIR = "$env:USERPROFILE\.ezbot"
$BIN_DIR = "$INSTALL_DIR\bin"

# --- Prereq checks ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js 20 or later is required. Install from https://nodejs.org"; exit 1
}
$nodeMajor = [int](node -e "process.stdout.write(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 20) {
  Write-Error "Node.js 20 or later is required (found $(node --version))."; exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required but was not found."; exit 1
}

Write-Host "Installing ezbot CLI..."
New-Item -ItemType Directory -Force -Path $INSTALL_DIR, $BIN_DIR | Out-Null

Write-Host "Downloading CLI bundle..."
Invoke-WebRequest -Uri "$EZBOT/cli.cjs" -OutFile "$INSTALL_DIR\cli.cjs"

Write-Host "Installing native serial port driver..."
'{"name":"ezbot-runtime","private":true,"dependencies":{"serialport":"^13.0.0"}}' |
  Set-Content "$INSTALL_DIR\package.json"
npm install --prefix $INSTALL_DIR --omit=dev --silent

# Launcher sets EZBOT_INSTALL_DIR for the uninstall prompt in cli.js
@"
@echo off
set EZBOT_INSTALL_DIR=%USERPROFILE%\.ezbot
node "%USERPROFILE%\.ezbot\cli.cjs" %*
"@ | Set-Content "$BIN_DIR\ezbot.cmd"

Write-Host ""
Write-Host "Done! Run: $BIN_DIR\ezbot.cmd"
Write-Host "Add $BIN_DIR to your PATH to use 'ezbot' from anywhere."
