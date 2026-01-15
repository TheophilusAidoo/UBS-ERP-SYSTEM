#!/bin/bash

echo "🛑 Stopping email server..."
pkill -f "app.cjs" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

echo "✅ Server stopped"
echo ""
echo "🚀 Starting email server with 50MB body limit..."
echo ""

npm start
