#!/bin/bash

# Script to add EmailJS variables to .env file

ENV_FILE=".env"

echo "📧 Adding EmailJS configuration to .env file..."
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env file not found. Creating it..."
    cat > "$ENV_FILE" << 'EOF'
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo
VITE_OPENAI_API_KEY=

# EmailJS Configuration (for sending invoices via email)
# Get these from https://www.emailjs.com/ after creating an account
# See EMAILJS_SETUP.md for detailed setup instructions
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
EOF
    echo "✅ .env file created with EmailJS variables"
    exit 0
fi

# Check if EmailJS variables already exist
if grep -q "VITE_EMAILJS_SERVICE_ID" "$ENV_FILE"; then
    echo "✅ EmailJS variables already exist in .env"
    echo ""
    echo "Current EmailJS configuration:"
    grep "VITE_EMAILJS" "$ENV_FILE"
    exit 0
fi

# Add EmailJS variables
echo "Adding EmailJS configuration..."
echo "" >> "$ENV_FILE"
echo "# EmailJS Configuration (for sending invoices via email)" >> "$ENV_FILE"
echo "# Get these from https://www.emailjs.com/ after creating an account" >> "$ENV_FILE"
echo "# See EMAILJS_SETUP.md for detailed setup instructions" >> "$ENV_FILE"
echo "VITE_EMAILJS_SERVICE_ID=your_service_id" >> "$ENV_FILE"
echo "VITE_EMAILJS_TEMPLATE_ID=your_template_id" >> "$ENV_FILE"
echo "VITE_EMAILJS_PUBLIC_KEY=your_public_key" >> "$ENV_FILE"

echo "✅ EmailJS variables added to .env file"
echo ""
echo "📝 Next Steps:"
echo "1. Go to https://www.emailjs.com/ and create a free account"
echo "2. Create an email service and get your Service ID"
echo "3. Create an email template and get your Template ID"
echo "4. Get your Public Key from Account settings"
echo "5. Edit .env file and replace the placeholder values with your actual credentials"
echo "6. Restart your dev server: npm run dev"
echo ""
echo "📖 For detailed instructions, see: EMAILJS_SETUP.md or QUICK_EMAILJS_SETUP.md"

