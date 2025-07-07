"""
URL patterns for AI Service endpoints
"""

from django.urls import path
from . import views

app_name = 'ai_service'

urlpatterns = [
    # Context analysis endpoints
    path('analyze-context/', views.analyze_context, name='analyze_context'),
    path('context-insights/', views.get_context_insights, name='context_insights'),
    
    # Task AI endpoints
    path('task-suggestions/', views.get_ai_task_suggestions, name='task_suggestions'),
    path('prioritize-tasks/', views.prioritize_tasks, name='prioritize_tasks'),
    
    # Analysis and statistics endpoints
    path('workload-analysis/', views.get_workload_analysis, name='workload_analysis'),
    path('ai-stats/', views.get_ai_stats, name='ai_stats'),
]

