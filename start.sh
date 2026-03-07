#!/bin/bash

# Install and start backend
echo "Installing backend dependencies..."
cd backend && npm install
echo "Starting backend..."
npm start &
BACKEND_PID=$!
cd ..

# Install and start frontend
echo "Installing frontend dependencies..."
cd frontend && npm install
echo "Starting frontend..."
npm start &
FRONTEND_PID=$!

# Handle Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
