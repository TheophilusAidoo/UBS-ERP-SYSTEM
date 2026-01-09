#!/bin/bash

# Create .env file with Supabase credentials
cat > .env << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo

# OpenAI API Key (for AI features - optional)
VITE_OPENAI_API_KEY=
EOF

echo "✅ .env file created successfully!"
echo ""
echo "Next steps:"
echo "1. Run the database schema in Supabase SQL Editor (see SETUP_SUPABASE.md)"
echo "2. Restart your dev server: npm run dev"


