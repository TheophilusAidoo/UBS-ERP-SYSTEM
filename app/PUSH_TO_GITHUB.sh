#!/bin/bash

# Quick script to push to GitHub
# Run this from the project root

cd "/Users/alphamac/Downloads/UBS ERP "

echo "🚀 Pushing changes to GitHub..."
echo ""

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Staging all changes..."
    git add -A
    echo "✅ Changes staged"
    echo ""
fi

# Check if there are commits to push
if [ -n "$(git log origin/main..main 2>/dev/null)" ] || [ -n "$(git status --porcelain)" ]; then
    echo "💾 Committing changes..."
    git commit -m "Update: Scrolling fixes and image preview features" 2>/dev/null || echo "No new changes to commit"
    echo ""
    
    echo "📤 Pushing to GitHub..."
    echo "⚠️  You'll be prompted for GitHub credentials..."
    echo ""
    
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully pushed to GitHub!"
        echo "🔗 Repository: https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM"
    else
        echo ""
        echo "❌ Push failed. Please authenticate manually:"
        echo "   git push origin main"
        echo ""
        echo "💡 Use Personal Access Token as password"
    fi
else
    echo "✅ Everything is up to date!"
fi
