#!/bin/bash

# Smart Todo List - Frontend Deployment Script
# This script builds and deploys the React frontend

set -e  # Exit on any error

echo "🚀 Starting Smart Todo List Frontend Deployment..."

# Check if we're in the right directory
if [ ! -d "frontend/smart-todo-frontend" ]; then
    echo "❌ Error: Please run this script from the smart-todo-app root directory"
    exit 1
fi

# Navigate to frontend directory
cd frontend/smart-todo-frontend

echo "📦 Installing Node.js dependencies..."
npm install

echo "🔧 Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cat > .env << EOF
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Smart Todo List
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true

# Development
VITE_DEBUG_MODE=false
EOF
    echo "⚠️  Please edit .env file with your actual configuration values"
fi

echo "🏗️  Building production bundle..."
npm run build

echo "✅ Frontend build completed!"
echo ""
echo "🔥 To start the production server:"
echo "cd frontend/smart-todo-frontend"
echo "npm run preview"
echo ""
echo "📁 Production files are in: frontend/smart-todo-frontend/dist/"
echo "🌐 Frontend will be available at: http://localhost:4173"
echo ""
echo "📋 For static hosting, upload the 'dist' folder contents to your web server"

