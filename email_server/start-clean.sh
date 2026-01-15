#!/bin/bash

# Kill all existing email server processes and start fresh

echo "🛑 Stopping all email server processes..."
pkill -f "app.cjs" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

echo "✅ Cleared all processes"
echo ""
echo "🚀 Starting email server..."
echo ""

npm start
