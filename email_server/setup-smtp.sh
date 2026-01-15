#!/bin/bash

# Setup SMTP Configuration for UBS ERP Email Server
# This script creates the backend/.env file with SMTP credentials

echo "📧 Setting up SMTP configuration for UBS ERP..."
echo ""

# Create .env file in backend directory
cat > backend/.env << EOF
# SMTP Email Configuration for UBS ERP
# Using cPanel email server (mail.ubscrm.com)

SMTP_HOST=mail.ubscrm.com
SMTP_PORT=465
SMTP_USER=info@ubscrm.com
SMTP_PASSWORD=Aidoo@1998

# Optional: Custom "From" name for emails
SMTP_FROM_NAME=UBS ERP System

# Server Port (default: 3001)
PORT=3001
EOF

echo "✅ SMTP configuration created in backend/.env"
echo ""
echo "Configuration:"
echo "  Host: mail.ubscrm.com"
echo "  Port: 465"
echo "  User: info@ubscrm.com"
echo "  Password: *** (hidden)"
echo ""
echo "📧 Email server is ready!"
echo ""
echo "To start the email server, run:"
echo "  cd backend && node email-server.js"
echo ""
echo "Or use nodemon for auto-restart:"
echo "  cd backend && npx nodemon email-server.js"
