@echo off
setlocal

set ROOT=%~dp0

REM Start backend in a new terminal window (production mode)
start "LMS Backend" cmd /k "cd /d "%ROOT%backend" && npm start"

REM Start frontend in a new terminal window
start "LMS Frontend" cmd /k "cd /d "%ROOT%frontend" && npx expo start"

echo.
echo [LMS] Both backend and frontend are starting in separate windows.
echo [LMS] Backend:  http://localhost:5000
echo [LMS] Frontend: Expo dev server
echo.
