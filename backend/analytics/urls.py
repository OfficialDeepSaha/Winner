"""
URL patterns for the Analytics module of Smart Todo Application
"""

from django.urls import path
from . import views

urlpatterns = [
    path('task-stats/', views.task_stats, name='task_stats'),
    path('workload-analysis/', views.workload_analysis, name='workload_analysis'),
    path('ai-stats/', views.ai_stats, name='ai_stats'),
    path('context-insights/', views.context_insights, name='context_insights'),
    path('productivity-trend/', views.productivity_trend, name='productivity_trend'),
    path('completion-trend/', views.completion_trend, name='completion_trend'),
    path('productivity-data/', views.productivity_trend_data, name='productivity_trend_data'),
    path('prioritize-tasks/', views.prioritize_tasks, name='prioritize_tasks'),
]
