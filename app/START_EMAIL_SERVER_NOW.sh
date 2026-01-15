#!/bin/bash

# Quick Start Email Server - Run this to start the email server

echo "🚀 Starting UBS ERP Email Server..."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend" || {
  echo "❌ Error: backend directory not found!"
  exit 1
}

# Kill any existing server
echo "🛑 Stopping any existing email servers..."
pkill -f "email-server.js" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null 2>/dev/null
sleep 1

# Verify .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cat > .env << 'EOF'
SMTP_HOST=mail.ubscrm.com
SMTP_PORT=465
SMTP_USER=info@ubscrm.com
SMTP_PASSWORD=Aidoo@1998
SMTP_FROM_NAME=UBS ERP System
PORT=3001
EOF
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting email server on port 3001..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Keep this terminal window open!"
echo "⚠️  The server must stay running to send emails."
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the server (foreground so user can see it)
node email-server.js
