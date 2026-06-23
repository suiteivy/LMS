@echo off
setlocal

set ROOT=%~dp0

REM Start backend in a new PowerShell window (production mode)
start "LMS Backend" powershell -NoExit -Command "cd '%ROOT%backend'; npm start"

REM Start frontend in a new PowerShell window
start "LMS Frontend" powershell -NoExit -Command "cd '%ROOT%frontend'; npx expo start"

echo.
echo [LMS] Both backend and frontend are starting in separate windows.
echo [LMS] Backend:  http://localhost:5000
echo [LMS] Frontend: Expo dev server
echo.