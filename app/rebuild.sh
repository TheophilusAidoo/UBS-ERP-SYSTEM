#!/bin/bash
# Rebuild script for UBS ERP
# Run: bash rebuild.sh

echo "🔨 Rebuilding UBS ERP Application..."
echo ""

# Navigate to project root (handle spaces in path)
cd "$(dirname "$0")" || exit 1

# Build the application
echo "📦 Running npm build..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build completed successfully!"
  echo "📁 Built files are in: dist/"
  echo ""
  echo "🚀 To start the server, run: node app.cjs"
else
  echo ""
  echo "❌ Build failed. Please check the errors above."
  exit 1
fi
