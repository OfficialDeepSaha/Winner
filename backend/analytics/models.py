"""
Models for the Analytics module of Smart Todo Application

Includes models for storing analytics data, user productivity metrics,
and AI-generated insights.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import json


class AnalyticsSnapshot(models.Model):
    """Stores periodic analytics snapshots for users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analytics_snapshots')
    
    # Time period this snapshot represents
    date = models.DateField(default=timezone.now)
    period_type = models.CharField(max_length=10, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly')
    ])
    
    # Key metrics
    tasks_created = models.IntegerField(default=0)
    tasks_completed = models.IntegerField(default=0)
    avg_completion_time = models.FloatField(default=0)  # In hours
    completion_rate = models.FloatField(default=0)  # Percentage
    
    # Workload metrics
    workload_level = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High')
    ], default='medium')
    total_estimated_hours = models.FloatField(default=0)
    high_priority_count = models.IntegerField(default=0)
    upcoming_deadlines_count = models.IntegerField(default=0)
    
    # AI accuracy metrics
    ai_accuracy_score = models.FloatField(default=0)  # Percentage
    ai_suggestion_acceptance_rate = models.FloatField(default=0)  # Percentage
    ai_priority_accuracy = models.FloatField(default=0)  # Percentage
    
    # JSON fields for detailed data
    priority_distribution = models.JSONField(default=dict)  # {'low': 5, 'medium': 10, ...}
    category_stats = models.JSONField(default=dict)  # [{'name': 'Work', 'total': 10, 'completed': 5}, ...]
    productivity_trend = models.JSONField(default=dict)  # {'day1': 75, 'day2': 80, ...}
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'date', 'period_type')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['period_type']),
        ]
    
    def __str__(self):
        return f"{self.user.username}'s {self.period_type} analytics on {self.date}"


class AIInsight(models.Model):
    """Stores AI-generated insights about user productivity and task management"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_insights')
    
    # Insight details
    insight_type = models.CharField(max_length=20, choices=[
        ('productivity', 'Productivity'),
        ('workload', 'Workload'),
        ('patterns', 'Patterns'),
        ('recommendation', 'Recommendation'),
        ('context', 'Context')
    ])
    title = models.CharField(max_length=100)
    description = models.TextField()
    confidence_score = models.FloatField(default=0.0)  # AI confidence in this insight
    
    # Relevance and action
    importance_level = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High')
    ], default='medium')
    action_required = models.BooleanField(default=False)
    action_description = models.TextField(blank=True, null=True)
    
    # Associated data
    related_data = models.JSONField(default=dict, blank=True)  # Any additional data for visualization
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # When this insight is no longer relevant
    
    class Meta:
        ordering = ['-created_at', '-importance_level']
    
    def __str__(self):
        return f"{self.insight_type}: {self.title}"
    
    def is_expired(self):
        """Check if the insight has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
