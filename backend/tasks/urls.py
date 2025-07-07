"""
URL patterns for Tasks app
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'tasks'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'tags', views.TagViewSet, basename='tag')
router.register(r'context-entries', views.ContextEntryViewSet, basename='contextentry')
router.register(r'calendar-events', views.CalendarEventViewSet, basename='calendarevent')
router.register(r'time-blocks', views.TimeBlockViewSet, basename='timeblock')

urlpatterns = [
    # ViewSet URLs
    path('', include(router.urls)),
    
    # Additional API endpoints
    path('stats/', views.get_task_stats, name='task_stats'),
    path('dashboard/', views.get_dashboard_data, name='dashboard_data'),
    path('bulk-update/', views.bulk_update_tasks, name='bulk_update_tasks'),
    path('bulk-delete/', views.bulk_delete_tasks, name='bulk_delete_tasks'),
    
    # AI scheduling endpoints
    path('ai-scheduling-suggestions/', views.ai_scheduling_suggestions, name='ai_scheduling_suggestions'),
    path('optimize-schedule/', views.optimize_schedule, name='optimize_schedule'),
]

