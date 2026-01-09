#!/bin/bash

# EmailJS Setup Script
# This script adds EmailJS configuration to your .env file

echo "📧 EmailJS Setup Script"
echo "======================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env-template.txt .env
    echo "✅ .env file created"
    echo ""
fi

# Check if EmailJS variables already exist
if grep -q "VITE_EMAILJS_SERVICE_ID" .env; then
    echo "⚠️  EmailJS variables already exist in .env"
    echo "   If you want to update them, edit .env manually"
    echo ""
    echo "Current EmailJS configuration:"
    grep "VITE_EMAILJS" .env
    exit 0
fi

# Add EmailJS variables to .env
echo "Adding EmailJS configuration to .env..."
echo "" >> .env
echo "# EmailJS Configuration (for sending invoices via email)" >> .env
echo "# Get these from https://www.emailjs.com/ after creating an account" >> .env
echo "# See EMAILJS_SETUP.md for detailed setup instructions" >> .env
echo "VITE_EMAILJS_SERVICE_ID=your_service_id" >> .env
echo "VITE_EMAILJS_TEMPLATE_ID=your_template_id" >> .env
echo "VITE_EMAILJS_PUBLIC_KEY=your_public_key" >> .env

echo "✅ EmailJS variables added to .env"
echo ""
echo "📝 Next Steps:"
echo "1. Go to https://www.emailjs.com/ and create a free account"
echo "2. Create an email service (Gmail, Outlook, etc.)"
echo "3. Create an email template"
echo "4. Get your Service ID, Template ID, and Public Key"
echo "5. Edit .env file and replace 'your_service_id', 'your_template_id', and 'your_public_key' with your actual values"
echo "6. Restart your dev server: npm run dev"
echo ""
echo "📖 For detailed instructions, see: EMAILJS_SETUP.md"

