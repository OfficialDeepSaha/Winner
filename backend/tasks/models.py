from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import datetime
from django.utils import timezone


class Category(models.Model):
    """Model for task categories and tags"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color code
    description = models.TextField(blank=True, null=True)
    usage_frequency = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['-usage_frequency', 'name']

    def __str__(self):
        return self.name

    def increment_usage(self):
        """Increment usage frequency when category is used"""
        self.usage_frequency += 1
        self.save()


class Task(models.Model):
    """Model for storing task details"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    original_description = models.TextField(blank=True, null=True)  # Store original before AI enhancement
    
    # AI-generated fields
    enhanced_description = models.TextField(blank=True, null=True)
    ai_priority_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(10.0)]
    )
    ai_suggested_deadline = models.DateTimeField(blank=True, null=True)
    ai_reasoning = models.TextField(blank=True, null=True)  # Store AI reasoning for transparency
    
    # User-defined fields
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    deadline = models.DateTimeField(blank=True, null=True)
    estimated_duration = models.IntegerField(blank=True, null=True, help_text="Duration in minutes")
    
    # Time-blocking fields
    scheduled_start_time = models.DateTimeField(blank=True, null=True)
    scheduled_end_time = models.DateTimeField(blank=True, null=True)
    is_time_blocked = models.BooleanField(default=False)
    
    # Relationships
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    tags = models.ManyToManyField('Tag', blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    # Context-related fields
    context_processed = models.BooleanField(default=False)
    last_ai_analysis = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-ai_priority_score', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['ai_priority_score']),
            models.Index(fields=['deadline']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_priority_display()})"

    def save(self, *args, **kwargs):
        # Update completed_at when status changes to completed
        if self.status == 'completed' and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        elif self.status != 'completed':
            self.completed_at = None
        
        # Increment category usage
        if self.category:
            self.category.increment_usage()
        
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if task is overdue"""
        if self.deadline and self.status not in ['completed', 'cancelled']:
            from django.utils import timezone
            return timezone.now() > self.deadline
        return False

    @property
    def urgency_level(self):
        """Calculate urgency based on deadline and priority"""
        if self.is_overdue:
            return 'overdue'
        elif self.priority == 'urgent':
            return 'urgent'
        elif self.deadline:
            from django.utils import timezone
            time_left = self.deadline - timezone.now()
            if time_left.days <= 1:
                return 'urgent'
            elif time_left.days <= 3:
                return 'high'
        return self.priority


class Tag(models.Model):
    """Model for task tags"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#6B7280')  # Hex color code
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-usage_count', 'name']

    def __str__(self):
        return self.name


class ContextEntry(models.Model):
    """Model for storing daily context data"""
    
    SOURCE_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('email', 'Email'),
        ('notes', 'Notes'),
        ('calendar', 'Calendar'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='context_entries')
    content = models.TextField()
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_details = models.JSONField(blank=True, null=True)  # Store additional metadata
    
    # AI processing results
    processed_insights = models.TextField(blank=True, null=True)
    extracted_tasks = models.JSONField(blank=True, null=True)  # Store potential tasks found
    sentiment_score = models.FloatField(blank=True, null=True)
    urgency_indicators = models.JSONField(blank=True, null=True)
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    processing_error = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    content_date = models.DateTimeField(blank=True, null=True)  # When the content was originally created

    class Meta:
        verbose_name_plural = "Context entries"
        ordering = ['-content_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'source_type']),
            models.Index(fields=['is_processed']),
            models.Index(fields=['content_date']),
        ]

    def __str__(self):
        return f"{self.get_source_type_display()} - {self.content[:50]}..."


class TaskContextRelation(models.Model):
    """Model to link tasks with relevant context entries"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='context_relations')
    context_entry = models.ForeignKey(ContextEntry, on_delete=models.CASCADE, related_name='task_relations')
    relevance_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="AI-calculated relevance score between 0 and 1"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['task', 'context_entry']
        ordering = ['-relevance_score']

    def __str__(self):
        return f"{self.task.title} <-> {self.context_entry.source_type} (Score: {self.relevance_score})"


class AIAnalysisLog(models.Model):
    """Model to log AI analysis requests and responses for debugging and improvement"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_logs')
    analysis_type = models.CharField(max_length=50)  # 'task_prioritization', 'deadline_suggestion', etc.
    input_data = models.JSONField()
    output_data = models.JSONField(blank=True, null=True)
    processing_time = models.FloatField(blank=True, null=True)  # Time in seconds
    error_message = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.analysis_type} - {status} ({self.created_at})"


class UserSettings(models.Model):
    """Model for user settings and preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    dark_mode = models.BooleanField(default=False)
    notification_enabled = models.BooleanField(default=True)
    # AI features settings
    ai_suggestions = models.BooleanField(default=True)
    ai_prioritization = models.BooleanField(default=True)
    ai_context_analysis = models.BooleanField(default=True)
    # Time preferences
    working_hours_start = models.TimeField(default=datetime.time(9, 0))
    working_hours_end = models.TimeField(default=datetime.time(17, 0))
    # Calendar settings
    calendar_integration_enabled = models.BooleanField(default=True)
    calendar_view_default = models.CharField(
        max_length=20, 
        choices=[
            ('day', 'Day'), 
            ('week', 'Week'), 
            ('month', 'Month')
        ],
        default='week'
    )
    # Task preferences
    default_task_view = models.CharField(max_length=20, default='list')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.user.username}"


class CalendarEvent(models.Model):
    """Model for calendar events"""
    
    EVENT_TYPE_CHOICES = [
        ('task', 'Task'),
        ('meeting', 'Meeting'),
        ('appointment', 'Appointment'),
        ('reminder', 'Reminder'),
        ('other', 'Other'),
    ]
    
    RECURRENCE_CHOICES = [
        ('none', 'None'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_events')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    
    # Time fields
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    
    # Event details
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='other')
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color code
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='none')
    recurrence_end_date = models.DateTimeField(blank=True, null=True)
    
    # Related task (optional)
    related_task = models.ForeignKey(Task, on_delete=models.SET_NULL, blank=True, null=True, related_name='calendar_events')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['user', 'start_time']),
            models.Index(fields=['event_type']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"
    
    @property
    def duration_minutes(self):
        """Calculate event duration in minutes"""
        if not self.end_time or not self.start_time:
            return 0
        delta = self.end_time - self.start_time
        return delta.total_seconds() / 60
    
    @property
    def is_past(self):
        """Check if event is in the past"""
        return self.end_time < timezone.now()
    
    @property
    def is_ongoing(self):
        """Check if event is currently ongoing"""
        now = timezone.now()
        return self.start_time <= now <= self.end_time


class TimeBlock(models.Model):
    """Model for time-blocking slots"""
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_blocks')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_blocks')
    
    # Time details
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(blank=True, null=True)  # When user actually started
    actual_end_time = models.DateTimeField(blank=True, null=True)    # When user actually finished
    
    # Status
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True, null=True)  # Notes about this specific time block
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['user', 'start_time']),
            models.Index(fields=['task', 'status']),
        ]
    
    def __str__(self):
        return f"{self.task.title} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def duration_minutes(self):
        """Calculate scheduled duration in minutes"""
        if not self.end_time or not self.start_time:
            return 0
        delta = self.end_time - self.start_time
        return delta.total_seconds() / 60
    
    @property
    def actual_duration_minutes(self):
        """Calculate actual duration in minutes"""
        if not self.actual_end_time or not self.actual_start_time:
            return 0
        delta = self.actual_end_time - self.actual_start_time
        return delta.total_seconds() / 60
    
    @property
    def is_past(self):
        """Check if time block is in the past"""
        return self.end_time < timezone.now()
    
    @property
    def is_ongoing(self):
        """Check if time block is currently ongoing"""
        now = timezone.now()
        return self.start_time <= now <= self.end_time
