#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_CMD="$PROJECT_ROOT/.venv/bin/invokeai-web"
FRONTEND_DIR="$PROJECT_ROOT/invokeai/frontend/web"
FRONTEND_VITE="$FRONTEND_DIR/node_modules/.bin/vite"
BACKEND_URL="http://127.0.0.1:9090"
BACKEND_HEALTH_URL="$BACKEND_URL/api/v1/app/version"
BACKEND_LOG="${TMPDIR:-/tmp}/invokeai-web-dev.log"
BACKEND_READY_TIMEOUT_SECONDS="${BACKEND_READY_TIMEOUT_SECONDS:-180}"
BACKEND_PORT="9090"
FRONTEND_PORT="5173"

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

stop_pid() {
  local pid="$1"
  local label="$2"

  if [[ -z "$pid" || "$pid" == "$$" ]]; then
    return
  fi

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return
  fi

  echo "Stopping existing $label (PID $pid)..."
  kill "$pid" >/dev/null 2>&1 || true

  for _ in {1..20}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return
    fi
    sleep 0.25
  done

  echo "Force-stopping existing $label (PID $pid)..."
  kill -9 "$pid" >/dev/null 2>&1 || true
}

stop_listeners_on_port() {
  local port="$1"
  local label="$2"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  for pid in ${(f)pids}; do
    stop_pid "$pid" "$label on port $port"
  done
}

stop_existing_processes() {
  local backend_pids

  echo "Checking for existing InvokeAI dev processes..."

  backend_pids="$(pgrep -f "$BACKEND_CMD" 2>/dev/null || true)"
  for pid in ${(f)backend_pids}; do
    stop_pid "$pid" "InvokeAI backend"
  done

  stop_listeners_on_port "$BACKEND_PORT" "backend listener"
  stop_listeners_on_port "$FRONTEND_PORT" "frontend listener"
}

stop_existing_processes

echo "Starting backend: $BACKEND_CMD"
: > "$BACKEND_LOG"
PYTHONUNBUFFERED=1 "$BACKEND_CMD" >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Backend URL: $BACKEND_URL"
echo "Backend log: $BACKEND_LOG"

cleanup() {
  if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo ""
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

wait_for_backend() {
  local elapsed=0

  echo "Waiting for backend at $BACKEND_HEALTH_URL ..."
  until curl -fsS "$BACKEND_HEALTH_URL" >/dev/null 2>&1; do
    if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
      echo ""
      echo "Backend exited before it became ready. Last backend log lines:"
      tail -n 80 "$BACKEND_LOG" || true
      exit 1
    fi

    if (( elapsed >= BACKEND_READY_TIMEOUT_SECONDS )); then
      echo ""
      echo "Backend did not become ready after ${BACKEND_READY_TIMEOUT_SECONDS}s. Last backend log lines:"
      tail -n 80 "$BACKEND_LOG" || true
      exit 1
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "Backend is ready: $BACKEND_URL"
}

wait_for_backend

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
