#!/bin/bash

# Script to restart the email server
# This will kill any existing email server and start a new one

echo "🛑 Stopping any running email servers on port 3001..."
# Kill processes on port 3001 (email server port)
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No server running on port 3001"

# Also kill any node processes running email-server.js
pkill -f "app.cjs" 2>/dev/null || echo "No app.cjs processes found"

echo "⏳ Waiting 2 seconds for processes to terminate..."
sleep 2

echo "🚀 Starting email server..."
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found. Creating default .env..."
  cat > .env << 'EOF'
SMTP_HOST=mail.ubscrm.com
SMTP_PORT=465
SMTP_USER=info@ubscrm.com
SMTP_PASSWORD=Aidoo@1998
SMTP_FROM_NAME=UBS ERP System
PORT=3001
EOF
fi

# Start the server
echo "🚀 Starting email server on port 3001..."
node app.cjs
