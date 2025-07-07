# ✨ Smart Todo List - AI-Powered Task Management

<div align="center">
  <img src="screenshots/Screenshot%202025-07-07%20191338.png" alt="Smart Todo App Dashboard" width="800">
</div>

A modern, intelligent task and calendar management application that leverages AI to help you prioritize, organize, and complete your tasks more efficiently while managing your schedule seamlessly.

## 🌟 Features

### Core Features
- **Smart Task Management**: Create, edit, and organize tasks with intelligent categorization
- **AI-Powered Prioritization**: Automatic task prioritization based on context and deadlines
- **Context-Aware Suggestions**: AI analyzes your daily context (emails, messages, notes) to suggest relevant tasks
- **Intelligent Deadline Prediction**: AI suggests realistic deadlines based on task complexity
- **Smart Categorization**: Automatic task categorization using machine learning
- **Calendar Integration**: Seamless calendar management with events and time blocks
- **AI Schedule Optimization**: Optimize your daily schedule based on task priorities

### Advanced Features
- **Analytics Dashboard**: Comprehensive insights into your productivity patterns
- **Workload Analysis**: AI-powered workload assessment and recommendations
- **Context Input**: Add daily context for better AI analysis
- **Time Blocking**: Block time for focused work on specific tasks
- **Event Management**: Create and manage calendar events with task associations
- **Visual Calendar**: Interactive calendar with drag-and-drop capabilities
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: Customizable appearance
- **Real-time Updates**: Live synchronization across devices

## 📸 Screenshots

<div align="center">
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20142131.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142159.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142218.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20142242.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142313.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142328.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20142340.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142357.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142425.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20142439.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142458.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20142547.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20142618.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20191241.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20191338.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20191357.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20204817.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20205803.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20205817.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20211334.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20212302.png" width="280">
  </p>
  <p>
    <img src="screenshots/Screenshot%202025-07-07%20212335.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20212400.png" width="280">
    <img src="screenshots/Screenshot%202025-07-07%20214514.png" width="280">
  </p>
</div>

## 🏗️ Architecture

### Backend (Django REST Framework)
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI Integration**: Google Gemini API for intelligent features
- **Authentication**: Token-based authentication
- **API Documentation**: Auto-generated with DRF

### Frontend (React + Tailwind CSS)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Icons**: Lucide React icons
- **Charts**: Recharts for analytics visualization
- **Routing**: React Router for navigation
- **State Management**: React hooks and context

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **npm or yarn** (package manager)
- **Git** (version control)

### Optional
- **PostgreSQL** (for production database)
- **Google Gemini API Key** (for AI features)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smart-todo-app
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip3 install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python3 manage.py makemigrations
python3 manage.py migrate

# Create superuser (optional)
python3 manage.py createsuperuser

# Start development server
python3 manage.py runserver 0.0.0.0:8000
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend/smart-todo-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin

## 🔧 Configuration

### Backend Configuration (.env)

```env
# Django Configuration
SECRET_KEY=your-super-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database Configuration
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# AI Service Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend Configuration (.env)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Smart Todo List
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
```

## 🚀 Deployment

### Automated Deployment

Use the provided deployment scripts for easy setup:

```bash
# Deploy backend
chmod +x deploy_backend.sh
./deploy_backend.sh

# Deploy frontend
chmod +x deploy_frontend.sh
./deploy_frontend.sh
```

### Manual Deployment

#### Backend (Production)

```bash
cd backend

# Install dependencies
pip3 install -r requirements.txt

# Set production environment
export DJANGO_SETTINGS_MODULE=smart_todo_backend.settings_production

# Run migrations
python3 manage.py migrate

# Collect static files
python3 manage.py collectstatic --noinput

# Start with Gunicorn
gunicorn smart_todo_backend.wsgi:application --bind 0.0.0.0:8000
```

#### Frontend (Production)

```bash
cd frontend/smart-todo-frontend

# Install dependencies
npm install

# Build for production
npm run build

# Serve with a static server or upload dist/ to your hosting provider
npm run preview  # For testing the production build
```

## 📚 API Documentation

### Authentication

All API endpoints require authentication except for login/register.

```bash
# Login
POST /api/auth/login/
{
  "username": "your_username",
  "password": "your_password"
}

# Response
{
  "token": "your-auth-token",
  "user": {...}
}
```

### Core Endpoints

#### Tasks
- `GET /api/tasks/` - List all tasks
- `POST /api/tasks/` - Create a new task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task

#### Categories
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create a new category

#### Context
- `GET /api/context/` - List context entries
- `POST /api/context/` - Add context entry

#### AI Services
- `POST /api/ai/analyze-context/` - Analyze context for task suggestions
- `POST /api/ai/prioritize-tasks/` - Get AI task prioritization
- `POST /api/ai/suggest-deadline/` - Get deadline suggestions
- `GET /api/ai/workload-analysis/` - Get workload analysis

## 🧪 Testing

### Backend Tests

```bash
cd backend
python3 manage.py test
```

### Frontend Tests

```bash
cd frontend/smart-todo-frontend
npm run test
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL
   - Check that both servers are running

2. **Database Errors**
   - Run migrations: `python3 manage.py migrate`
   - Check database configuration in `.env`

3. **AI Features Not Working**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API quota and billing

4. **Frontend Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

### Getting Help

- Check the console for error messages
- Verify all environment variables are set
- Ensure all dependencies are installed
- Check that both backend and frontend servers are running

## 🛠️ Development

### Project Structure

```
smart-todo-app/
├── backend/                 # Django backend
│   ├── smart_todo_backend/  # Main Django project
│   ├── tasks/              # Tasks app
│   ├── ai_service/         # AI integration
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # React frontend
│   └── smart-todo-frontend/
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── hooks/      # Custom hooks
│       │   └── lib/        # Utilities
│       ├── package.json
│       └── vite.config.js
├── deploy_backend.sh       # Backend deployment script
├── deploy_frontend.sh      # Frontend deployment script
└── README.md
```

### Adding New Features

1. **Backend**: Create new Django apps or extend existing ones
2. **Frontend**: Add new components in `src/components/`
3. **API**: Define new endpoints in Django views
4. **UI**: Use shadcn/ui components for consistency

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🤖 Sample Tasks & AI Suggestions

### AI-Generated Task Suggestions

Based on your context inputs, the Smart Todo app can generate intelligent task suggestions:

<div align="center">
  <img src="screenshots/Screenshot%202025-07-07%20142340.png" alt="AI Task Suggestions" width="700">
</div>

### Sample AI Interactions

| User Input | AI Response |
|------------|-------------|
| "I need to prepare for a presentation next week" | **AI Suggestion:** "Added task 'Prepare presentation slides' with High priority due 3 days before the meeting" |
| "I'm feeling overwhelmed with work" | **AI Response:** "Analyzing your workload. Recommendation: reschedule 3 low-priority tasks and block 2 hours for focused work tomorrow" |
| "My project deadline is approaching" | **AI Suggestion:** "Created a task sequence with 4 subtasks to help you meet the project deadline efficiently" |
| "Need to plan a team meeting" | **AI Response:** "Suggested optimal meeting time based on team availability: Tuesday at 2 PM. Created event with preparation tasks" |

<div align="center">
  <img src="screenshots/Screenshot%202025-07-07%20142458.png" alt="Context Analysis" width="700">
</div>

### Workload Optimization

The AI analyzes your task list and provides workload optimization:

<div align="center">
  <img src="screenshots/Screenshot%202025-07-07%20191338.png" alt="Workload Optimization" width="700">
</div>

## 📊 API Documentation

### Authentication

All API endpoints require token authentication except for login/register.

```bash
# Login
POST /api/auth/login/
{
  "username": "your_username",
  "password": "your_password"
}

# Response
{
  "token": "your-auth-token",
  "user": {...}
}
```

### Core API Endpoints

#### Tasks
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks/` | GET | List all tasks with filters (status, priority, category, etc.) |
| `/api/tasks/` | POST | Create a new task |
| `/api/tasks/{id}/` | GET | Get task details |
| `/api/tasks/{id}/` | PUT | Update task |
| `/api/tasks/{id}/` | DELETE | Delete task |
| `/api/tasks/bulk_update/` | POST | Perform bulk operations (mark complete, change priority) |

#### Categories
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/categories/` | GET | List all categories |
| `/api/categories/` | POST | Create a new category |
| `/api/categories/{id}/` | GET | Get category details |
| `/api/categories/{id}/` | PUT | Update category |
| `/api/categories/{id}/` | DELETE | Delete category |

#### AI Services
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/analyze-context/` | POST | Analyze context for task suggestions |
| `/api/ai/prioritize-tasks/` | POST | Get AI task prioritization |
| `/api/ai/suggest-deadline/` | POST | Get deadline suggestions |
| `/api/ai/workload-analysis/` | GET | Get workload analysis |

For full API documentation, see the [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) file.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

<div align="center">
  <p><strong>Built with ❤️ using Django, React, and AI</strong></p>
  <p>
    <a href="https://www.djangoproject.com/"><img src="https://img.shields.io/badge/Django-4.2-%23092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django"></a>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18-%2361DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-CSS-%2338B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"></a>
    <a href="https://cloud.google.com/vertex-ai"><img src="https://img.shields.io/badge/Powered%20by-Google%20AI-%234285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google AI"></a>
  </p>
</div>

