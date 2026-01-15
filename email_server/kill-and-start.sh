#!/bin/bash

# Kill existing processes and start email server

echo "🛑 Stopping any existing email servers..."
pkill -f "email-server.js" 2>/dev/null
pkill -f "app.cjs" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

echo "✅ Cleared existing processes"
echo ""
echo "🚀 Starting email server..."
echo ""

npm start
