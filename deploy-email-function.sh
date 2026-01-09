#!/bin/bash

# Deploy Supabase Edge Function for Email Sending
# This script deploys the send-email function to your Supabase project

set -e

echo "🚀 Deploying Supabase Edge Function: send-email"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  You need to login to Supabase first."
    echo ""
    echo "Run: supabase login"
    echo ""
    read -p "Do you want to login now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase login
    else
        echo "Please login first and run this script again."
        exit 1
    fi
fi

# Project reference from your setup
PROJECT_REF="shejpknspmrlgbjhhptx"

echo "📦 Linking to project: $PROJECT_REF"
supabase link --project-ref $PROJECT_REF

echo ""
echo "🔨 Deploying send-email function..."
supabase functions deploy send-email

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Go to Admin Settings > System Settings > Email Configuration"
echo "2. Enter your Resend API key: re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9"
echo "3. Set your 'From Email' (use onboarding@resend.dev for testing)"
echo "4. Click 'Save Email Settings'"
echo "5. Click 'Send Test Email' to verify it works"
echo ""


