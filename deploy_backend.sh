#!/bin/bash

# Smart Todo List - Backend Deployment Script
# This script sets up and deploys the Django backend

set -e  # Exit on any error

echo "🚀 Starting Smart Todo List Backend Deployment..."

# Check if we're in the right directory
if [ ! -f "backend/manage.py" ]; then
    echo "❌ Error: Please run this script from the smart-todo-app root directory"
    exit 1
fi

# Navigate to backend directory
cd backend

echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

echo "🔧 Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cat > .env << EOF
# Django Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database Configuration (SQLite for simplicity)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db_production.sqlite3

# AI Service Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
    echo "⚠️  Please edit .env file with your actual configuration values"
fi

echo "🗄️  Running database migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

echo "📊 Collecting static files..."
python3 manage.py collectstatic --noinput

echo "👤 Creating superuser (optional)..."
echo "You can create a superuser account by running:"
echo "python3 manage.py createsuperuser"

echo "✅ Backend deployment completed!"
echo ""
echo "🔥 To start the production server:"
echo "cd backend"
echo "gunicorn smart_todo_backend.wsgi:application --bind 0.0.0.0:8000"
echo ""
echo "🌐 Backend will be available at: http://localhost:8000"
echo "📋 Admin panel: http://localhost:8000/admin/"
echo "🔗 API endpoints: http://localhost:8000/api/"

