"""
URL Configuration for Smart Todo Backend

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from rest_framework.authtoken.views import obtain_auth_token
from .auth_views import user_profile
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """API root endpoint with available endpoints"""
    return Response({
        'message': 'Smart Todo List API',
        'version': '1.0.0',
        'endpoints': {
            'authentication': {
                'login': '/api/auth/login/',
                'token': '/api/auth/token/',
            },
            'tasks': {
                'tasks': '/api/tasks/',
                'categories': '/api/categories/',
                'tags': '/api/tags/',
                'context_entries': '/api/context-entries/',
                'stats': '/api/stats/',
                'dashboard': '/api/dashboard/',
            },
            'ai_service': {
                'analyze_context': '/api/ai/analyze-context/',
                'task_suggestions': '/api/ai/task-suggestions/',
                'prioritize_tasks': '/api/ai/prioritize-tasks/',
                'context_insights': '/api/ai/context-insights/',
                'workload_analysis': '/api/ai/workload-analysis/',
                'ai_stats': '/api/ai/ai-stats/',
            },
            'analytics': {
                'task_stats': '/api/analytics/task-stats/',
                'workload_analysis': '/api/analytics/workload-analysis/',
                'ai_stats': '/api/analytics/ai-stats/',
                'context_insights': '/api/analytics/context-insights/',
                'productivity_trend': '/api/analytics/productivity-trend/',
            },
            'admin': '/admin/',
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'message': 'Smart Todo API is running',
        'debug': settings.DEBUG
    })


urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # API root and health check
    path('api/', api_root, name='api_root'),
    path('health/', health_check, name='health_check'),
    
    # Authentication
    path('api/auth/token/', obtain_auth_token, name='api_token_auth'),
    path('api/auth/user/', user_profile, name='user_profile'),
    
    # Main API endpoints
    path('api/', include('tasks.urls')),
    path('api/ai/', include('ai_service.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/data/', include('data_management.urls')),
]

# Customize admin site
admin.site.site_header = 'Smart Todo Administration'
admin.site.site_title = 'Smart Todo Admin'
admin.site.index_title = 'Welcome to Smart Todo Administration'

