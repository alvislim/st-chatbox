#!/bin/bash

# Start backend
echo "Starting backend..."
cd backend && npm start &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd frontend && npm start &
FRONTEND_PID=$!

# Handle Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
