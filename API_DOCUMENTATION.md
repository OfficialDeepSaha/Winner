# Smart Todo List - API Documentation

This document provides comprehensive documentation for the Smart Todo List REST API, including all endpoints, request/response formats, and usage examples.

## 🔗 Base URL

```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

## 🔐 Authentication

The API uses token-based authentication. Include the token in the Authorization header for protected endpoints.

```http
Authorization: Token your-auth-token-here
```

### Authentication Endpoints

#### Login
```http
POST /api/auth/login/
```

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response (200 OK):**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid credentials"
}
```

#### Register
```http
POST /api/auth/register/
```

**Request Body:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201 Created):**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 2,
    "username": "new_user",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### Logout
```http
POST /api/auth/logout/
```

**Headers:**
```http
Authorization: Token your-auth-token-here
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

## 📋 Tasks API

### List Tasks
```http
GET /api/tasks/
```

**Query Parameters:**
- `status`: Filter by status (`pending`, `in_progress`, `completed`)
- `priority`: Filter by priority (`low`, `medium`, `high`, `urgent`)
- `category`: Filter by category ID
- `search`: Search in title and description
- `ordering`: Sort by field (`-created_at`, `due_date`, `-ai_priority_score`)
- `page`: Page number for pagination
- `page_size`: Number of items per page (default: 20)

**Example Request:**
```http
GET /api/tasks/?status=pending&priority=high&ordering=-ai_priority_score
```

**Response (200 OK):**
```json
{
  "count": 25,
  "next": "http://localhost:8000/api/tasks/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Complete project proposal",
      "description": "Write and submit the Q4 project proposal",
      "status": "pending",
      "priority": "high",
      "due_date": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-01T09:00:00Z",
      "updated_at": "2024-01-01T09:00:00Z",
      "completed_at": null,
      "estimated_hours": 4.5,
      "ai_priority_score": 0.85,
      "ai_suggested_deadline": "2024-01-14T17:00:00Z",
      "category": {
        "id": 1,
        "name": "Work",
        "color": "#3B82F6"
      },
      "tags": [
        {
          "id": 1,
          "name": "urgent"
        },
        {
          "id": 2,
          "name": "proposal"
        }
      ],
      "user": 1
    }
  ]
}
```

### Create Task
```http
POST /api/tasks/
```

**Request Body:**
```json
{
  "title": "New task title",
  "description": "Task description",
  "priority": "medium",
  "due_date": "2024-01-20T15:00:00Z",
  "estimated_hours": 2.0,
  "category": 1,
  "tags": [1, 2]
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "title": "New task title",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "due_date": "2024-01-20T15:00:00Z",
  "created_at": "2024-01-02T10:00:00Z",
  "updated_at": "2024-01-02T10:00:00Z",
  "completed_at": null,
  "estimated_hours": 2.0,
  "ai_priority_score": 0.65,
  "ai_suggested_deadline": "2024-01-19T17:00:00Z",
  "category": {
    "id": 1,
    "name": "Work",
    "color": "#3B82F6"
  },
  "tags": [
    {
      "id": 1,
      "name": "urgent"
    },
    {
      "id": 2,
      "name": "proposal"
    }
  ],
  "user": 1
}
```

### Get Task Details
```http
GET /api/tasks/{id}/
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Complete project proposal",
  "description": "Write and submit the Q4 project proposal",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-01-15T10:00:00Z",
  "created_at": "2024-01-01T09:00:00Z",
  "updated_at": "2024-01-01T09:00:00Z",
  "completed_at": null,
  "estimated_hours": 4.5,
  "ai_priority_score": 0.85,
  "ai_suggested_deadline": "2024-01-14T17:00:00Z",
  "category": {
    "id": 1,
    "name": "Work",
    "color": "#3B82F6"
  },
  "tags": [
    {
      "id": 1,
      "name": "urgent"
    }
  ],
  "user": 1
}
```

### Update Task
```http
PUT /api/tasks/{id}/
```

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "due_date": "2024-01-15T10:00:00Z",
  "created_at": "2024-01-01T09:00:00Z",
  "updated_at": "2024-01-02T11:00:00Z",
  "completed_at": null,
  "estimated_hours": 4.5,
  "ai_priority_score": 0.90,
  "ai_suggested_deadline": "2024-01-14T17:00:00Z",
  "category": {
    "id": 1,
    "name": "Work",
    "color": "#3B82F6"
  },
  "tags": [
    {
      "id": 1,
      "name": "urgent"
    }
  ],
  "user": 1
}
```

### Delete Task
```http
DELETE /api/tasks/{id}/
```

**Response (204 No Content)**

### Bulk Operations
```http
POST /api/tasks/bulk_update/
```

**Request Body:**
```json
{
  "task_ids": [1, 2, 3],
  "action": "mark_completed"
}
```

**Response (200 OK):**
```json
{
  "message": "3 tasks updated successfully",
  "updated_tasks": [1, 2, 3]
}
```

## 📂 Categories API

### List Categories
```http
GET /api/categories/
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Work",
    "description": "Work-related tasks",
    "color": "#3B82F6",
    "task_count": 15,
    "user": 1
  },
  {
    "id": 2,
    "name": "Personal",
    "description": "Personal tasks and goals",
    "color": "#10B981",
    "task_count": 8,
    "user": 1
  }
]
```

### Create Category
```http
POST /api/categories/
```

**Request Body:**
```json
{
  "name": "Health",
  "description": "Health and fitness related tasks",
  "color": "#EF4444"
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "name": "Health",
  "description": "Health and fitness related tasks",
  "color": "#EF4444",
  "task_count": 0,
  "user": 1
}
```

## 🏷️ Tags API

### List Tags
```http
GET /api/tags/
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "urgent",
    "task_count": 5
  },
  {
    "id": 2,
    "name": "proposal",
    "task_count": 3
  }
]
```

### Create Tag
```http
POST /api/tags/
```

**Request Body:**
```json
{
  "name": "meeting"
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "name": "meeting",
  "task_count": 0
}
```

## 📝 Context API

### List Context Entries
```http
GET /api/context/
```

**Query Parameters:**
- `date`: Filter by specific date (YYYY-MM-DD)
- `entry_type`: Filter by type (`email`, `message`, `note`, `meeting`)
- `ordering`: Sort by field (`-created_at`, `date`)

**Response (200 OK):**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "content": "Meeting with client about project requirements",
      "entry_type": "meeting",
      "date": "2024-01-02",
      "created_at": "2024-01-02T14:30:00Z",
      "ai_processed": true,
      "sentiment_score": 0.7,
      "extracted_tasks": [
        "Follow up on project timeline",
        "Prepare technical specification"
      ],
      "user": 1
    }
  ]
}
```

### Create Context Entry
```http
POST /api/context/
```

**Request Body:**
```json
{
  "content": "Had a productive meeting with the team about Q1 goals",
  "entry_type": "meeting",
  "date": "2024-01-02"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "content": "Had a productive meeting with the team about Q1 goals",
  "entry_type": "meeting",
  "date": "2024-01-02",
  "created_at": "2024-01-02T15:00:00Z",
  "ai_processed": false,
  "sentiment_score": null,
  "extracted_tasks": [],
  "user": 1
}
```

## 🤖 AI Services API

### Analyze Context
```http
POST /api/ai/analyze-context/
```

**Request Body:**
```json
{
  "context_entries": [1, 2, 3],
  "analysis_type": "task_extraction"
}
```

**Response (200 OK):**
```json
{
  "analysis_id": "uuid-string",
  "suggested_tasks": [
    {
      "title": "Follow up on client feedback",
      "description": "Review and address client concerns from yesterday's meeting",
      "priority": "high",
      "estimated_hours": 2.0,
      "suggested_category": "Work",
      "confidence_score": 0.85
    }
  ],
  "insights": [
    "High workload detected in work category",
    "Consider delegating some tasks",
    "Schedule buffer time for unexpected tasks"
  ],
  "sentiment_analysis": {
    "overall_sentiment": 0.6,
    "stress_indicators": ["tight deadline", "multiple meetings"],
    "positive_indicators": ["productive", "team collaboration"]
  }
}
```

### Prioritize Tasks
```http
POST /api/ai/prioritize-tasks/
```

**Request Body:**
```json
{
  "task_ids": [1, 2, 3, 4],
  "context_window_days": 7
}
```

**Response (200 OK):**
```json
{
  "prioritized_tasks": [
    {
      "task_id": 1,
      "ai_priority_score": 0.95,
      "reasoning": "High priority due to approaching deadline and client importance",
      "recommended_order": 1
    },
    {
      "task_id": 3,
      "ai_priority_score": 0.78,
      "reasoning": "Medium priority, good to complete before weekend",
      "recommended_order": 2
    }
  ],
  "workload_assessment": {
    "total_estimated_hours": 12.5,
    "available_hours": 16.0,
    "workload_level": "manageable",
    "recommendations": [
      "Focus on high-priority tasks first",
      "Consider breaking down large tasks"
    ]
  }
}
```

### Suggest Deadline
```http
POST /api/ai/suggest-deadline/
```

**Request Body:**
```json
{
  "task_title": "Complete project documentation",
  "task_description": "Write comprehensive documentation for the new feature",
  "estimated_hours": 6.0,
  "priority": "medium",
  "current_workload": 15.5
}
```

**Response (200 OK):**
```json
{
  "suggested_deadline": "2024-01-18T17:00:00Z",
  "confidence_score": 0.82,
  "reasoning": "Based on current workload and task complexity, allowing 3 days for completion",
  "alternative_deadlines": [
    {
      "date": "2024-01-17T17:00:00Z",
      "confidence": 0.65,
      "note": "Aggressive timeline, may require overtime"
    },
    {
      "date": "2024-01-22T17:00:00Z",
      "confidence": 0.95,
      "note": "Conservative timeline with buffer time"
    }
  ]
}
```

### Get Workload Analysis
```http
GET /api/ai/workload-analysis/
```

**Query Parameters:**
- `days`: Number of days to analyze (default: 7)
- `include_completed`: Include completed tasks (default: false)

**Response (200 OK):**
```json
{
  "analysis_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-07",
    "total_days": 7
  },
  "workload_metrics": {
    "total_tasks": 15,
    "pending_tasks": 8,
    "in_progress_tasks": 3,
    "completed_tasks": 4,
    "total_estimated_hours": 32.5,
    "completed_hours": 12.0,
    "remaining_hours": 20.5
  },
  "workload_level": "high",
  "stress_indicators": [
    "Multiple high-priority tasks",
    "Overlapping deadlines",
    "Limited available time"
  ],
  "recommendations": [
    "Consider postponing non-critical tasks",
    "Break down large tasks into smaller chunks",
    "Schedule focused work blocks",
    "Delegate tasks where possible"
  ],
  "productivity_insights": {
    "most_productive_time": "09:00-11:00",
    "completion_rate": 0.73,
    "average_task_duration": 2.8
  }
}
```

### Get AI Statistics
```http
GET /api/ai/stats/
```

**Query Parameters:**
- `days`: Number of days to analyze (default: 30)

**Response (200 OK):**
```json
{
  "period": {
    "start_date": "2023-12-03",
    "end_date": "2024-01-02",
    "total_days": 30
  },
  "ai_usage": {
    "total_analyses": 45,
    "context_analyses": 15,
    "task_prioritizations": 20,
    "deadline_suggestions": 10
  },
  "accuracy_metrics": {
    "deadline_accuracy": 0.82,
    "priority_accuracy": 0.78,
    "task_completion_prediction": 0.85
  },
  "user_engagement": {
    "suggestions_accepted": 32,
    "suggestions_rejected": 8,
    "acceptance_rate": 0.80
  },
  "time_saved": {
    "estimated_hours": 12.5,
    "tasks_auto_prioritized": 67,
    "deadlines_auto_suggested": 23
  }
}
```

## 📊 Analytics API

### Get Task Statistics
```http
GET /api/analytics/task-stats/
```

**Query Parameters:**
- `period`: Time period (`week`, `month`, `quarter`, `year`)
- `start_date`: Custom start date (YYYY-MM-DD)
- `end_date`: Custom end date (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "period_type": "month"
  },
  "task_metrics": {
    "total_tasks": 45,
    "completed_tasks": 32,
    "pending_tasks": 8,
    "in_progress_tasks": 5,
    "completion_rate": 0.71
  },
  "priority_distribution": {
    "low": 12,
    "medium": 18,
    "high": 10,
    "urgent": 5
  },
  "category_stats": [
    {
      "category": "Work",
      "total": 25,
      "completed": 18,
      "completion_rate": 0.72
    },
    {
      "category": "Personal",
      "total": 15,
      "completed": 12,
      "completion_rate": 0.80
    }
  ],
  "productivity_trends": [
    {
      "date": "2024-01-01",
      "tasks_completed": 3,
      "hours_worked": 6.5
    },
    {
      "date": "2024-01-02",
      "tasks_completed": 2,
      "hours_worked": 4.0
    }
  ]
}
```

## ❌ Error Responses

### Common Error Codes

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "title": ["This field is required."],
    "due_date": ["Invalid date format."]
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid authentication token."
}
```

#### 403 Forbidden
```json
{
  "error": "Permission denied",
  "message": "You don't have permission to access this resource."
}
```

#### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "The requested task does not exist."
}
```

#### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

## 📝 Request/Response Headers

### Common Request Headers
```http
Content-Type: application/json
Authorization: Token your-auth-token-here
Accept: application/json
```

### Common Response Headers
```http
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 🔄 Pagination

List endpoints use cursor-based pagination:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/tasks/?page=2",
  "previous": null,
  "results": [...]
}
```

## 🚀 Rate Limiting

- **Authenticated users**: 1000 requests per hour
- **Anonymous users**: 100 requests per hour
- **AI endpoints**: 50 requests per hour

## 📋 API Versioning

The API uses URL versioning:
- Current version: `v1` (default)
- Future versions: `v2`, `v3`, etc.

Example: `/api/v1/tasks/` or `/api/tasks/` (defaults to v1)

This API documentation provides comprehensive coverage of all available endpoints and their usage patterns for the Smart Todo List application.

