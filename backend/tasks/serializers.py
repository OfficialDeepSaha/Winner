"""
Serializers for Task Management API

This module provides serializers for converting model instances to JSON
and handling API request/response data validation.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, Category, Tag, ContextEntry, TaskContextRelation, AIAnalysisLog, CalendarEvent, TimeBlock
from django.utils import timezone


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'color', 'description', 'usage_frequency',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_frequency', 'created_at', 'updated_at']

    def validate_color(self, value):
        """Validate hex color format"""
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError("Color must be in hex format (#RRGGBB)")
        try:
            int(value[1:], 16)
        except ValueError:
            raise serializers.ValidationError("Invalid hex color format")
        return value


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'usage_count', 'created_at']
        read_only_fields = ['id', 'usage_count', 'created_at']

    def validate_color(self, value):
        """Validate hex color format"""
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError("Color must be in hex format (#RRGGBB)")
        try:
            int(value[1:], 16)
        except ValueError:
            raise serializers.ValidationError("Invalid hex color format")
        return value


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model"""
    
    category = CategorySerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    user = UserSerializer(read_only=True)
    
    # Computed fields
    is_overdue = serializers.ReadOnlyField()
    urgency_level = serializers.ReadOnlyField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'user', 'title', 'description', 'original_description',
            'enhanced_description', 'ai_priority_score', 'ai_suggested_deadline',
            'ai_reasoning', 'priority', 'status', 'deadline', 'estimated_duration',
            'category', 'category_id', 'tags', 'tag_ids', 'created_at', 'updated_at',
            'completed_at', 'context_processed', 'last_ai_analysis',
            'is_overdue', 'urgency_level'
        ]
        read_only_fields = [
            'id', 'user', 'enhanced_description', 'ai_priority_score',
            'ai_suggested_deadline', 'ai_reasoning', 'created_at', 'updated_at',
            'completed_at', 'context_processed', 'last_ai_analysis',
            'is_overdue', 'urgency_level'
        ]

    def validate_estimated_duration(self, value):
        """Validate estimated duration is positive"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Estimated duration must be positive")
        return value

    def validate_deadline(self, value):
        """Validate deadline is in the future"""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Deadline must be in the future")
        return value

    def create(self, validated_data):
        """Create task with category and tags"""
        category_id = validated_data.pop('category_id', None)
        tag_ids = validated_data.pop('tag_ids', [])
        
        # Set user from request context
        validated_data['user'] = self.context['request'].user
        
        # Store original description
        if 'description' in validated_data:
            validated_data['original_description'] = validated_data['description']
        
        # Create task
        task = Task.objects.create(**validated_data)
        
        # Set category
        if category_id:
            try:
                category = Category.objects.get(id=category_id)
                task.category = category
                task.save()
            except Category.DoesNotExist:
                pass
        
        # Set tags
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids)
            task.tags.set(tags)
        
        return task

    def update(self, instance, validated_data):
        """Update task with category and tags"""
        category_id = validated_data.pop('category_id', None)
        tag_ids = validated_data.pop('tag_ids', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update category
        if category_id is not None:
            if category_id:
                try:
                    category = Category.objects.get(id=category_id)
                    instance.category = category
                except Category.DoesNotExist:
                    pass
            else:
                instance.category = None
        
        # Update tags
        if tag_ids is not None:
            tags = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(tags)
        
        instance.save()
        return instance


class TaskCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for task creation"""
    
    category_name = serializers.CharField(required=False, allow_blank=True)
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'priority', 'deadline', 'estimated_duration',
            'category_name', 'tag_names'
        ]

    def create(self, validated_data):
        """Create task with category and tags by name"""
        category_name = validated_data.pop('category_name', None)
        tag_names = validated_data.pop('tag_names', [])
        
        # Set user from request context
        validated_data['user'] = self.context['request'].user
        validated_data['original_description'] = validated_data.get('description', '')
        
        # Create task
        task = Task.objects.create(**validated_data)
        
        # Set category by name
        if category_name:
            category, created = Category.objects.get_or_create(
                name=category_name,
                defaults={'color': '#3B82F6'}
            )
            task.category = category
            task.save()
        
        # Set tags by name
        if tag_names:
            tags = []
            for tag_name in tag_names:
                tag, created = Tag.objects.get_or_create(
                    name=tag_name,
                    defaults={'color': '#6B7280'}
                )
                tags.append(tag)
            task.tags.set(tags)
        
        return task


class ContextEntrySerializer(serializers.ModelSerializer):
    """Serializer for ContextEntry model"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ContextEntry
        fields = [
            'id', 'user', 'content', 'source_type', 'source_details',
            'processed_insights', 'extracted_tasks', 'sentiment_score',
            'urgency_indicators', 'is_processed', 'processing_error',
            'created_at', 'processed_at', 'content_date'
        ]
        read_only_fields = [
            'id', 'user', 'processed_insights', 'extracted_tasks',
            'sentiment_score', 'urgency_indicators', 'is_processed',
            'processing_error', 'created_at', 'processed_at'
        ]

    def create(self, validated_data):
        """Create context entry with user from request"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ContextEntryCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for context entry creation"""
    
    class Meta:
        model = ContextEntry
        fields = ['content', 'source_type', 'source_details', 'content_date']

    def create(self, validated_data):
        """Create context entry with user from request"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TaskContextRelationSerializer(serializers.ModelSerializer):
    """Serializer for TaskContextRelation model"""
    
    task = TaskSerializer(read_only=True)
    context_entry = ContextEntrySerializer(read_only=True)
    
    class Meta:
        model = TaskContextRelation
        fields = ['id', 'task', 'context_entry', 'relevance_score', 'created_at']
        read_only_fields = ['id', 'created_at']


class AIAnalysisLogSerializer(serializers.ModelSerializer):
    """Serializer for AIAnalysisLog model"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = AIAnalysisLog
        fields = [
            'id', 'user', 'analysis_type', 'input_data', 'output_data',
            'processing_time', 'error_message', 'success', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class TaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for task lists"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    tag_names = serializers.StringRelatedField(source='tags', many=True, read_only=True)
    is_overdue = serializers.ReadOnlyField()
    urgency_level = serializers.ReadOnlyField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'status', 'deadline', 'ai_priority_score',
            'category_name', 'tag_names', 'created_at', 'is_overdue', 'urgency_level'
        ]


class TaskStatsSerializer(serializers.Serializer):
    """Serializer for task statistics"""
    
    total_tasks = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()
    in_progress_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    overdue_tasks = serializers.IntegerField()
    high_priority_tasks = serializers.IntegerField()
    tasks_by_category = serializers.DictField()
    completion_rate = serializers.FloatField()
    average_completion_time = serializers.FloatField()


class CategoryStatsSerializer(serializers.ModelSerializer):
    """Serializer for category with usage statistics"""
    
    task_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'color', 'usage_frequency', 'task_count']


class TagStatsSerializer(serializers.ModelSerializer):
    """Serializer for tag with usage statistics"""
    
    task_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'usage_count', 'created_at', 'task_count']
        read_only_fields = ['id', 'usage_count', 'created_at', 'task_count']


class CalendarEventSerializer(serializers.ModelSerializer):
    """Serializer for CalendarEvent model"""
    
    user = UserSerializer(read_only=True)
    related_task = TaskSerializer(read_only=True)
    related_task_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    # Computed fields
    duration_minutes = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    
    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'user', 'title', 'description', 'location', 'start_time', 'end_time',
            'all_day', 'event_type', 'color', 'is_recurring', 'recurrence_pattern',
            'recurrence_end_date', 'related_task', 'related_task_id', 'created_at', 'updated_at',
            'duration_minutes', 'is_past', 'is_ongoing'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'duration_minutes', 'is_past', 'is_ongoing']
    
    def validate(self, data):
        """Validate start and end times"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("End time must be after start time")
        
        return data
    
    def create(self, validated_data):
        related_task_id = validated_data.pop('related_task_id', None)
        # Remove user if provided via serializer.save to avoid duplicate kwarg
        validated_data.pop('user', None)
        
        # Get the related task if provided
        related_task = None
        if related_task_id:
            try:
                related_task = Task.objects.get(id=related_task_id)
            except Task.DoesNotExist:
                pass
        
        # Create the event
        event = CalendarEvent.objects.create(
            **validated_data,
            user=self.context['request'].user,
            related_task=related_task
        )
        
        return event


class CalendarEventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for calendar event lists"""
    
    related_task_title = serializers.CharField(source='related_task.title', read_only=True)
    is_past = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    
    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'start_time', 'end_time', 'all_day', 'event_type',
            'color', 'is_recurring', 'related_task_title', 'is_past', 'is_ongoing'
        ]


class TimeBlockSerializer(serializers.ModelSerializer):
    """Serializer for TimeBlock model"""
    
    user = UserSerializer(read_only=True)
    task = TaskSerializer(read_only=True)
    task_id = serializers.UUIDField(write_only=True)
    
    # Computed fields
    duration_minutes = serializers.ReadOnlyField()
    actual_duration_minutes = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    
    class Meta:
        model = TimeBlock
        fields = [
            'id', 'user', 'task', 'task_id', 'start_time', 'end_time',
            'actual_start_time', 'actual_end_time', 'status', 'notes',
            'created_at', 'updated_at', 'duration_minutes', 'actual_duration_minutes',
            'is_past', 'is_ongoing'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 
                           'duration_minutes', 'actual_duration_minutes', 'is_past', 'is_ongoing']
    
    def validate(self, data):
        """Validate start and end times"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("End time must be after start time")
        
        # Validate actual times if provided
        actual_start_time = data.get('actual_start_time')
        actual_end_time = data.get('actual_end_time')
        
        if actual_start_time and actual_end_time and actual_start_time >= actual_end_time:
            raise serializers.ValidationError("Actual end time must be after actual start time")
        
        return data
    
    def create(self, validated_data):
        task_id = validated_data.pop('task_id')
        # Remove any user passed in payload to prevent duplicate keyword
        validated_data.pop('user', None)
        
        # Get the task
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task not found")
        
        # Create the time block
        time_block = TimeBlock.objects.create(
            **validated_data,
            user=self.context['request'].user,
            task=task
        )
        
        # Update the task's time-blocking status
        task.is_time_blocked = True
        task.scheduled_start_time = time_block.start_time
        task.scheduled_end_time = time_block.end_time
        task.save()
        
        return time_block


class TimeBlockListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for time block lists"""
    
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_priority = serializers.CharField(source='task.priority', read_only=True)
    is_past = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    
    class Meta:
        model = TimeBlock
        fields = [
            'id', 'task_title', 'task_priority', 'start_time', 'end_time',
            'status', 'is_past', 'is_ongoing', 'duration_minutes'
        ]
