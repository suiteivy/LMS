#!/bin/bash

# Start backend
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
