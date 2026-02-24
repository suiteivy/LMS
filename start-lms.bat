@echo off
REM Start backend
cd backend
start cmd /k "npm start"
cd ..

REM Start frontend
cd frontend
start cmd /k "npm start"
cd ..

REM Both will run in new terminal windows
