#!/bin/bash

# Create backend/.env file
cat > backend/.env << 'EOF'
SMTP_HOST=mail.stockmartllc.com
SMTP_PORT=465
SMTP_USER=info@stockmartllc.com
SMTP_PASSWORD=Aidoo@1998
PORT=3001
EOF

echo "✅ Created backend/.env file"

# Install dependencies
cd backend
npm install

echo "✅ Installed dependencies"
echo "✅ Email server is ready!"
echo ""
echo "To start the server, run:"
echo "  cd backend && npm start"

