#!/bin/bash

# Create backend/.env file with updated SMTP settings
cat > backend/.env << 'EOF'
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

echo "✅ Updated backend/.env with new SMTP settings"

echo "✅ Created backend/.env file"

# Install dependencies
cd backend
npm install

echo "✅ Installed dependencies"
echo "✅ Email server is ready!"
echo ""
echo "To start the server, run:"
echo "  cd backend && npm start"

