#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_CMD="$PROJECT_ROOT/.venv/bin/invokeai-web"
FRONTEND_DIR="$PROJECT_ROOT/invokeai/frontend/web"
FRONTEND_VITE="$FRONTEND_DIR/node_modules/.bin/vite"

# .command files run in a non-interactive shell and may not get your normal PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm use --silent >/dev/null 2>&1 || nvm use --silent 22 >/dev/null 2>&1 || true
fi

if [[ ! -x "$BACKEND_CMD" ]]; then
  echo "Backend command not found or not executable: $BACKEND_CMD"
  echo "Create the venv and install dependencies first."
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "Starting backend: $BACKEND_CMD"
"$BACKEND_CMD" &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Backend URL: http://127.0.0.1:9090"

cleanup() {
  if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo ""
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting frontend in $FRONTEND_DIR"
cd "$FRONTEND_DIR"
if command -v pnpm >/dev/null 2>&1; then
  pnpm dev
elif [[ -x "$FRONTEND_VITE" ]]; then
  echo "pnpm is not installed or not on PATH; using local Vite binary."
  "$FRONTEND_VITE" dev
elif command -v corepack >/dev/null 2>&1; then
  echo "pnpm is not installed or not on PATH; trying corepack pnpm."
  corepack pnpm dev
else
  echo "pnpm is not installed or not on PATH, and local Vite was not found."
  echo "Install pnpm with: corepack enable && corepack prepare pnpm@10.12.4 --activate"
  exit 1
fi
