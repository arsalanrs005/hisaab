#!/usr/bin/env bash
set -euo pipefail

# Stop only common Hisab/Next development processes and free port 3000.
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti :3000 2>/dev/null || true)"
  if [[ -n "$PIDS" ]]; then
    kill -9 $PIDS 2>/dev/null || true
  fi
fi

pkill -f "$(pwd).*next (dev|build|start)" 2>/dev/null || true
pkill -f "$(pwd).*/node_modules/next/dist/server/lib/start-server" 2>/dev/null || true
rm -rf .next

echo "Cleared Next processes and .next cache."
echo "Starting Turbopack dev server..."
exec npm run dev
