#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start backend
cd "$SCRIPT_DIR/backend"
npm start &
BACKEND_PID=$!

# Start frontend
cd "$SCRIPT_DIR/frontend"
npx expo start &
FRONTEND_PID=$!

echo ""
echo "[LMS] Backend PID: $BACKEND_PID"
echo "[LMS] Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both."

# Forward Ctrl+C to both processes
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

wait $BACKEND_PID
wait $FRONTEND_PID
