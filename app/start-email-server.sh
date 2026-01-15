#!/bin/bash

# Start Email Server for UBS ERP
# This script ensures the email server is running

echo "🚀 Starting UBS ERP Email Server..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend" || {
  echo "❌ Error: backend directory not found!"
  exit 1
}

# Check if .env exists, create if not
if [ ! -f .env ]; then
  echo "📝 Creating .env file with default SMTP settings..."
  cat > .env << 'EOF'
SMTP_HOST=mail.ubscrm.com
SMTP_PORT=465
SMTP_USER=info@ubscrm.com
SMTP_PASSWORD=Aidoo@1998
SMTP_FROM_NAME=UBS ERP System
PORT=3001
EOF
fi

# Kill any existing server on port 3001 (email server port)
echo "🛑 Stopping any existing email servers..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "  No existing server found"
sleep 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the server
echo "🚀 Starting email server on port 3001..."
echo ""
echo "📧 SMTP Configuration:"
echo "   Host: mail.ubscrm.com"
echo "   Port: 465"
echo "   User: info@ubscrm.com"
echo ""
echo "💡 Email server will run on: http://localhost:3001"
echo "💡 Frontend runs on: http://localhost:3003"
echo "💡 Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node email-server.js
