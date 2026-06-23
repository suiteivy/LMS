#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start backend in a new PowerShell window
powershell.exe -NoExit -Command "cd '$SCRIPT_DIR/backend'; npm start" &
BACKEND_PID=$!

# Start frontend in a new PowerShell window
powershell.exe -NoExit -Command "cd '$SCRIPT_DIR/frontend'; npx expo start" &
FRONTEND_PID=$!

echo ""
echo "[LMS] Backend PID: $BACKEND_PID"
echo "[LMS] Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both."

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

wait $BACKEND_PID
wait $FRONTEND_PID