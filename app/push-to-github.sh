#!/bin/bash

# Script to push everything to GitHub
# Run this script from the project root directory

set -e

echo "🚀 Pushing UBS ERP System to GitHub..."
echo ""

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

echo "📍 Current directory: $PROJECT_ROOT"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
fi

# Update remote URL
echo "🔗 Setting remote URL..."
git remote set-url origin https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM.git || {
    echo "⚠️  Could not update remote URL. Setting it manually..."
    git remote remove origin 2>/dev/null || true
    git remote add origin https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM.git
}

# Verify remote
echo "✅ Remote configured:"
git remote -v
echo ""

# Add all files
echo "📦 Adding all files..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit. All files are already committed."
else
    echo "💾 Committing changes..."
    git commit -m "Complete UBS ERP System - Full implementation with email server, invoice management, multi-company support, and all features"
fi

# Show status
echo ""
echo "📊 Current status:"
git status --short | head -20
echo ""

# Push to GitHub
echo "🚀 Pushing to GitHub..."
echo "⚠️  You may be prompted for GitHub credentials..."
echo ""

# Try to push
if git push -u origin main; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 Repository: https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM"
else
    echo ""
    echo "❌ Push failed. This might be because:"
    echo "   1. GitHub credentials are required"
    echo "   2. The repository doesn't exist on GitHub yet"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Make sure the repository exists at: https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM"
    echo "   2. If it doesn't exist, create it on GitHub first"
    echo "   3. Then run this script again"
    echo ""
    echo "💡 Or push manually:"
    echo "   git push -u origin main"
fi
