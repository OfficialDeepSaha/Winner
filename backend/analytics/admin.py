"""
Admin configurations for Analytics models
"""

from django.contrib import admin
from .models import AnalyticsSnapshot, AIInsight


@admin.register(AnalyticsSnapshot)
class AnalyticsSnapshotAdmin(admin.ModelAdmin):
    """Admin interface for AnalyticsSnapshot model"""
    list_display = ('user', 'date', 'period_type', 'workload_level', 'completion_rate')
    list_filter = ('user', 'period_type', 'date', 'workload_level')
    search_fields = ('user__username',)
    date_hierarchy = 'date'


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    """Admin interface for AIInsight model"""
    list_display = ('user', 'insight_type', 'title', 'importance_level', 'created_at')
    list_filter = ('user', 'insight_type', 'importance_level', 'created_at')
    search_fields = ('user__username', 'title', 'description')
    date_hierarchy = 'created_at'
