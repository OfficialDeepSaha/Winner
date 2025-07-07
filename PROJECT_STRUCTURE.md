# Smart Todo List - Project Structure

This document provides a comprehensive overview of the Smart Todo List application's architecture, file organization, and component relationships.

## 📁 Root Directory Structure

```
smart-todo-app/
├── backend/                    # Django REST Framework Backend
├── frontend/                   # React Frontend Application
├── deploy_backend.sh          # Backend deployment script
├── deploy_frontend.sh         # Frontend deployment script
├── docker-compose.yml         # Docker orchestration
├── README.md                  # Main project documentation
├── PROJECT_STRUCTURE.md       # This file
├── API_DOCUMENTATION.md       # API reference guide
└── todo.md                    # Development progress tracker
```

## 🔧 Backend Structure (Django)

```
backend/
├── smart_todo_backend/        # Main Django project
│   ├── __init__.py
│   ├── settings.py           # Development settings
│   ├── settings_production.py # Production settings
│   ├── urls.py               # Main URL configuration
│   ├── wsgi.py               # WSGI application
│   └── asgi.py               # ASGI application
├── tasks/                     # Tasks management app
│   ├── __init__.py
│   ├── admin.py              # Django admin configuration
│   ├── apps.py               # App configuration
│   ├── models.py             # Database models
│   ├── serializers.py        # DRF serializers
│   ├── views.py              # API views
│   ├── urls.py               # App URL patterns
│   └── migrations/           # Database migrations
├── ai_service/               # AI integration module
│   ├── __init__.py
│   ├── ai_core.py            # Core AI functionality
│   ├── utils.py              # AI utility functions
│   ├── views.py              # AI API endpoints
│   └── urls.py               # AI URL patterns
├── manage.py                 # Django management script
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker configuration
└── .env                     # Environment variables
```

### Backend Components

#### Models (tasks/models.py)
- **Category**: Task categorization system
- **Tag**: Flexible tagging system
- **Task**: Core task entity with AI features
- **ContextEntry**: Daily context for AI analysis

#### AI Service (ai_service/)
- **ai_core.py**: Gemini API integration and core AI logic
- **utils.py**: Helper functions for AI processing
- **views.py**: AI-powered API endpoints

#### API Endpoints
- Authentication: `/api/auth/`
- Tasks: `/api/tasks/`
- Categories: `/api/categories/`
- Tags: `/api/tags/`
- Context: `/api/context/`
- AI Services: `/api/ai/`

## ⚛️ Frontend Structure (React)

```
frontend/smart-todo-frontend/
├── public/                   # Static assets
│   ├── index.html
│   └── favicon.ico
├── src/                      # Source code
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── Analytics.jsx    # Analytics dashboard
│   │   ├── ContextInput.jsx # Context input interface
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Layout.jsx       # App layout wrapper
│   │   ├── LoadingSpinner.jsx # Loading component
│   │   ├── LoginPage.jsx    # Authentication page
│   │   ├── Settings.jsx     # User settings
│   │   ├── TaskForm.jsx     # Task creation/editing
│   │   ├── TaskList.jsx     # Task management
│   │   └── ThemeProvider.jsx # Theme management
│   ├── hooks/               # Custom React hooks
│   │   ├── useAI.js         # AI services hook
│   │   ├── useAuth.jsx      # Authentication hook
│   │   ├── useTasks.js      # Task management hook
│   │   ├── use-toast.js     # Toast notifications
│   │   └── use-mobile.js    # Mobile detection
│   ├── lib/                 # Utility libraries
│   │   ├── api.js           # API service layer
│   │   └── utils.js         # General utilities
│   ├── App.jsx              # Main application component
│   ├── App.css              # Global styles
│   └── main.jsx             # Application entry point
├── package.json             # Node.js dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── Dockerfile              # Docker configuration
└── .env                    # Environment variables
```

### Frontend Components

#### Core Components
- **App.jsx**: Main application with routing
- **Layout.jsx**: Navigation and layout wrapper
- **Dashboard.jsx**: Overview and quick actions
- **TaskList.jsx**: Task management interface
- **TaskForm.jsx**: Task creation and editing

#### Feature Components
- **Analytics.jsx**: Productivity insights and charts
- **ContextInput.jsx**: Daily context input for AI
- **Settings.jsx**: User preferences and configuration

#### UI Components (shadcn/ui)
- Form components (Button, Input, Select, etc.)
- Layout components (Card, Dialog, Sheet, etc.)
- Feedback components (Alert, Toast, etc.)

#### Custom Hooks
- **useAuth**: Authentication state management
- **useTasks**: Task CRUD operations
- **useAI**: AI service interactions
- **use-toast**: Notification system

## 🔄 Data Flow

### Authentication Flow
1. User submits credentials via LoginPage
2. useAuth hook sends request to `/api/auth/login/`
3. Backend validates and returns JWT token
4. Token stored in localStorage
5. Subsequent requests include Authorization header

### Task Management Flow
1. User interacts with TaskList or TaskForm
2. useTasks hook manages state and API calls
3. Backend processes request and updates database
4. Response updates frontend state
5. UI re-renders with new data

### AI Integration Flow
1. User adds context via ContextInput
2. useAI hook sends data to AI endpoints
3. Backend processes with Gemini API
4. AI insights returned to frontend
5. Results displayed in Dashboard/Analytics

## 🎨 Styling Architecture

### Tailwind CSS Configuration
- **Base styles**: Global typography and layout
- **Component styles**: Reusable component classes
- **Utility classes**: Spacing, colors, responsive design

### Theme System
- **Light/Dark modes**: Automatic system detection
- **CSS variables**: Dynamic color switching
- **Component variants**: Consistent styling patterns

### Responsive Design
- **Mobile-first**: Progressive enhancement
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Touch-friendly**: Appropriate sizing for mobile

## 🔐 Security Architecture

### Backend Security
- **CORS**: Configured allowed origins
- **Authentication**: JWT token-based
- **Input validation**: DRF serializers
- **SQL injection**: Django ORM protection
- **XSS protection**: Built-in Django features

### Frontend Security
- **Token storage**: localStorage with expiration
- **API calls**: Automatic token inclusion
- **Route protection**: Authentication guards
- **Input sanitization**: React's built-in protection

## 📊 Database Schema

### Core Tables
- **auth_user**: Django user model
- **tasks_category**: Task categories
- **tasks_tag**: Task tags
- **tasks_task**: Main task entity
- **tasks_contextentry**: Daily context entries

### Relationships
- User → Tasks (One-to-Many)
- Category → Tasks (One-to-Many)
- Task ↔ Tags (Many-to-Many)
- User → ContextEntries (One-to-Many)

## 🚀 Deployment Architecture

### Development Environment
- **Backend**: Django development server (port 8000)
- **Frontend**: Vite development server (port 5173)
- **Database**: SQLite for simplicity

### Production Environment
- **Backend**: Gunicorn + Django (port 8000)
- **Frontend**: Static files served by web server
- **Database**: PostgreSQL for scalability
- **Reverse Proxy**: Nginx (optional)

### Docker Deployment
- **Multi-container**: Separate containers for each service
- **Database**: PostgreSQL container
- **Volumes**: Persistent data storage
- **Networks**: Internal container communication

## 🔧 Configuration Management

### Environment Variables
- **Backend**: Database, AI API keys, security settings
- **Frontend**: API endpoints, feature flags
- **Docker**: Service configuration and secrets

### Settings Files
- **Development**: `settings.py` with debug enabled
- **Production**: `settings_production.py` with security hardening
- **Docker**: Environment-specific overrides

## 📈 Performance Considerations

### Backend Optimization
- **Database indexing**: Optimized queries
- **Caching**: Redis for session storage (optional)
- **Static files**: WhiteNoise for serving
- **API pagination**: Efficient data loading

### Frontend Optimization
- **Code splitting**: Lazy loading of routes
- **Bundle optimization**: Vite's built-in optimization
- **Image optimization**: Responsive images
- **Caching**: Browser caching strategies

## 🧪 Testing Strategy

### Backend Testing
- **Unit tests**: Model and utility testing
- **Integration tests**: API endpoint testing
- **AI service mocking**: Isolated AI testing

### Frontend Testing
- **Component tests**: React Testing Library
- **Hook tests**: Custom hook validation
- **E2E tests**: User flow testing (optional)

## 📝 Development Workflow

### Git Workflow
- **Feature branches**: Isolated development
- **Pull requests**: Code review process
- **Main branch**: Production-ready code

### Development Process
1. Create feature branch
2. Implement backend changes
3. Update frontend components
4. Test integration
5. Update documentation
6. Submit pull request

This project structure provides a solid foundation for a scalable, maintainable AI-powered task management application.

