@echo off
setlocal

set ROOT=%~dp0

REM Synchronize frontend LAN IP with active network interface
call node "%ROOT%scripts\sync-dev-ip.js"

REM Start backend in a new PowerShell window (production mode)
start "LMS Backend" powershell -NoExit -Command "cd '%ROOT%backend'; npm start"

REM Start frontend in a new PowerShell window
start "LMS Frontend" powershell -NoExit -Command "cd '%ROOT%frontend'; npx expo start"

echo.
echo [LMS] Both backend and frontend are starting in separate windows.
echo [LMS] Backend:  http://localhost:4001
echo [LMS] Frontend: Expo dev server
echo.