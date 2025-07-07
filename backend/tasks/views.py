"""
Views for Task Management API

This module provides REST API endpoints for:
- Task CRUD operations
- Category and tag management
- Context entry management
- Task statistics and analytics
"""

import logging
import datetime
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.contrib.auth.models import User
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters

from .models import Task, Category, Tag, ContextEntry, TaskContextRelation, AIAnalysisLog, CalendarEvent, TimeBlock
from .serializers import (
    TaskSerializer, TaskCreateSerializer, TaskListSerializer, TaskStatsSerializer,
    CategorySerializer, CategoryStatsSerializer, TagSerializer, TagStatsSerializer,
    ContextEntrySerializer, ContextEntryCreateSerializer, TaskContextRelationSerializer,
    AIAnalysisLogSerializer, CalendarEventSerializer, CalendarEventListSerializer,
    TimeBlockSerializer, TimeBlockListSerializer
)


logger = logging.getLogger('tasks')


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination class"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class TaskFilter(filters.FilterSet):
    """Filter class for Task model"""
    
    status = filters.MultipleChoiceFilter(choices=Task.STATUS_CHOICES)
    priority = filters.MultipleChoiceFilter(choices=Task.PRIORITY_CHOICES)
    category = filters.UUIDFilter(field_name='category__id')
    tags = filters.UUIDFilter(field_name='tags__id')
    deadline_from = filters.DateTimeFilter(field_name='deadline', lookup_expr='gte')
    deadline_to = filters.DateTimeFilter(field_name='deadline', lookup_expr='lte')
    created_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    is_overdue = filters.BooleanFilter(method='filter_overdue')
    ai_priority_min = filters.NumberFilter(field_name='ai_priority_score', lookup_expr='gte')
    ai_priority_max = filters.NumberFilter(field_name='ai_priority_score', lookup_expr='lte')

    def __init__(self, data=None, *args, **kwargs):
        if data is not None:
            data = data.copy()
            for key in ['status', 'priority']:
                if key in data and (data[key] == '' or data[key] == ['']):
                    data.pop(key)
        super().__init__(data, *args, **kwargs)

    def filter_status(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(**{f"{name}__in": value})

    def filter_priority(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(**{f"{name}__in": value})

    status = filters.MultipleChoiceFilter(choices=Task.STATUS_CHOICES, method='filter_status')
    priority = filters.MultipleChoiceFilter(choices=Task.PRIORITY_CHOICES, method='filter_priority')
    
    class Meta:
        model = Task
        fields = [
            'status', 'priority', 'category', 'tags', 'deadline_from', 'deadline_to',
            'created_from', 'created_to', 'is_overdue', 'ai_priority_min', 'ai_priority_max'
        ]
    
    def filter_overdue(self, queryset, name, value):
        """Filter overdue tasks"""
        now = timezone.now()
        if value:
            return queryset.filter(
                deadline__lt=now,
                status__in=['pending', 'in_progress']
            )
        else:
            return queryset.exclude(
                deadline__lt=now,
                status__in=['pending', 'in_progress']
            )


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet for Task model"""
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ['title', 'description', 'enhanced_description']
    ordering_fields = [
        'created_at', 'updated_at', 'deadline', 'ai_priority_score', 'title'
    ]
    ordering = ['-ai_priority_score', '-created_at']
    
    def get_queryset(self):
        """Get tasks for the current user"""
        return Task.objects.filter(user=self.request.user).select_related(
            'category', 'user'
        ).prefetch_related('tags')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action == 'list':
            return TaskListSerializer
        else:
            return TaskSerializer
    
    def perform_create(self, serializer):
        """Create task with current user"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        """Mark task as completed"""
        try:
            task = self.get_object()
            task.status = 'completed'
            task.completed_at = timezone.now()
            task.save()
            
            serializer = self.get_serializer(task)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error marking task complete: {str(e)}")
            return Response(
                {'error': 'Failed to mark task as complete'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def mark_in_progress(self, request, pk=None):
        """Mark task as in progress"""
        try:
            task = self.get_object()
            task.status = 'in_progress'
            task.save()
            
            serializer = self.get_serializer(task)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error marking task in progress: {str(e)}")
            return Response(
                {'error': 'Failed to mark task as in progress'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue tasks"""
        now = timezone.now()
        overdue_tasks = self.get_queryset().filter(
            deadline__lt=now,
            status__in=['pending', 'in_progress']
        )
        
        page = self.paginate_queryset(overdue_tasks)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TaskListSerializer(overdue_tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming tasks (due in next 7 days)"""
        now = timezone.now()
        week_ahead = now + timedelta(days=7)
        
        upcoming_tasks = self.get_queryset().filter(
            deadline__gte=now,
            deadline__lte=week_ahead,
            status__in=['pending', 'in_progress']
        ).order_by('deadline')
        
        page = self.paginate_queryset(upcoming_tasks)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TaskListSerializer(upcoming_tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def high_priority(self, request):
        """Get high priority tasks"""
        high_priority_tasks = self.get_queryset().filter(
            Q(priority__in=['high', 'urgent']) | Q(ai_priority_score__gte=7.0),
            status__in=['pending', 'in_progress']
        ).order_by('-ai_priority_score', '-created_at')
        
        page = self.paginate_queryset(high_priority_tasks)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TaskListSerializer(high_priority_tasks, many=True)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for Category model"""
    
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'usage_frequency', 'created_at']
    ordering = ['-usage_frequency', 'name']
    
    @action(detail=False, methods=['get'])
    def with_stats(self, request):
        """Get categories with task count statistics"""
        categories = Category.objects.annotate(
            task_count=Count('task')
        ).order_by('-usage_frequency', 'name')
        
        page = self.paginate_queryset(categories)
        if page is not None:
            serializer = CategoryStatsSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = CategoryStatsSerializer(categories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get most popular categories"""
        popular_categories = Category.objects.filter(
            usage_frequency__gt=0
        ).order_by('-usage_frequency')[:10]
        
        serializer = CategorySerializer(popular_categories, many=True)
        return Response(serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    """ViewSet for Tag model"""
    
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'usage_count', 'created_at']
    ordering = ['-usage_count', 'name']
    
    @action(detail=False, methods=['get'])
    def with_stats(self, request):
        """Get tags with task count statistics"""
        tags = Tag.objects.annotate(
            task_count=Count('task')
        ).order_by('-usage_count', 'name')
        
        page = self.paginate_queryset(tags)
        if page is not None:
            serializer = TagStatsSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TagStatsSerializer(tags, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get most popular tags"""
        popular_tags = Tag.objects.filter(
            usage_count__gt=0
        ).order_by('-usage_count')[:20]
        
        serializer = TagSerializer(popular_tags, many=True)
        return Response(serializer.data)


class ContextEntryFilter(filters.FilterSet):
    """Filter class for ContextEntry model"""
    
    source_type = filters.MultipleChoiceFilter(choices=ContextEntry.SOURCE_CHOICES)
    is_processed = filters.BooleanFilter()
    created_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    content_date_from = filters.DateTimeFilter(field_name='content_date', lookup_expr='gte')
    content_date_to = filters.DateTimeFilter(field_name='content_date', lookup_expr='lte')
    
    class Meta:
        model = ContextEntry
        fields = [
            'source_type', 'is_processed', 'created_from', 'created_to',
            'content_date_from', 'content_date_to'
        ]


class ContextEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for ContextEntry model"""
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ContextEntryFilter
    search_fields = ['content', 'processed_insights']
    ordering_fields = ['created_at', 'content_date', 'source_type']
    ordering = ['-content_date', '-created_at']
    
    def get_queryset(self):
        """Get context entries for the current user"""
        return ContextEntry.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ContextEntryCreateSerializer
        else:
            return ContextEntrySerializer
    
    def perform_create(self, serializer):
        """Create context entry with current user"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unprocessed(self, request):
        """Get unprocessed context entries"""
        unprocessed = self.get_queryset().filter(is_processed=False)
        
        page = self.paginate_queryset(unprocessed)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(unprocessed, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent context entries (last 7 days)"""
        week_ago = timezone.now() - timedelta(days=7)
        recent_entries = self.get_queryset().filter(
            created_at__gte=week_ago
        ).order_by('-created_at')
        
        page = self.paginate_queryset(recent_entries)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(recent_entries, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_stats(request):
    """Get comprehensive task statistics for the user"""
    try:
        user = request.user
        
        # Basic task counts
        total_tasks = Task.objects.filter(user=user).count()
        pending_tasks = Task.objects.filter(user=user, status='pending').count()
        in_progress_tasks = Task.objects.filter(user=user, status='in_progress').count()
        completed_tasks = Task.objects.filter(user=user, status='completed').count()
        
        # Overdue tasks
        now = timezone.now()
        overdue_tasks = Task.objects.filter(
            user=user,
            deadline__lt=now,
            status__in=['pending', 'in_progress']
        ).count()
        
        # High priority tasks
        high_priority_tasks = Task.objects.filter(
            user=user,
            status__in=['pending', 'in_progress']
        ).filter(
            Q(priority__in=['high', 'urgent']) | Q(ai_priority_score__gte=7.0)
        ).count()
        
        # Tasks by category
        tasks_by_category = {}
        category_stats = Task.objects.filter(user=user).values(
            'category__name'
        ).annotate(count=Count('id'))
        
        for stat in category_stats:
            category_name = stat['category__name'] or 'Uncategorized'
            tasks_by_category[category_name] = stat['count']
        
        # Completion rate
        completion_rate = 0.0
        if total_tasks > 0:
            completion_rate = (completed_tasks / total_tasks) * 100
        
        # Average completion time (for completed tasks in last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        completed_recent = Task.objects.filter(
            user=user,
            status='completed',
            completed_at__gte=thirty_days_ago,
            completed_at__isnull=False
        )
        
        average_completion_time = 0.0
        if completed_recent.exists():
            total_time = 0
            count = 0
            for task in completed_recent:
                if task.completed_at and task.created_at:
                    time_diff = task.completed_at - task.created_at
                    total_time += time_diff.total_seconds()
                    count += 1
            
            if count > 0:
                average_completion_time = (total_time / count) / 3600  # Convert to hours
        
        stats_data = {
            'total_tasks': total_tasks,
            'pending_tasks': pending_tasks,
            'in_progress_tasks': in_progress_tasks,
            'completed_tasks': completed_tasks,
            'overdue_tasks': overdue_tasks,
            'high_priority_tasks': high_priority_tasks,
            'tasks_by_category': tasks_by_category,
            'completion_rate': round(completion_rate, 2),
            'average_completion_time': round(average_completion_time, 2)
        }
        
        serializer = TaskStatsSerializer(data=stats_data)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting task stats: {str(e)}")
        return Response(
            {'error': 'Failed to get task statistics', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class CalendarEventFilter(filters.FilterSet):
    """Filter class for CalendarEvent model"""
    
    event_type = filters.MultipleChoiceFilter(choices=CalendarEvent.EVENT_TYPE_CHOICES)
    start_from = filters.DateTimeFilter(field_name='start_time', lookup_expr='gte')
    start_to = filters.DateTimeFilter(field_name='start_time', lookup_expr='lte')
    end_from = filters.DateTimeFilter(field_name='end_time', lookup_expr='gte')
    end_to = filters.DateTimeFilter(field_name='end_time', lookup_expr='lte')
    is_recurring = filters.BooleanFilter()
    related_task = filters.UUIDFilter(field_name='related_task__id')
    
    class Meta:
        model = CalendarEvent
        fields = [
            'event_type', 'start_from', 'start_to', 'end_from', 'end_to',
            'is_recurring', 'related_task', 'all_day'
        ]


class CalendarEventViewSet(viewsets.ModelViewSet):
    """ViewSet for CalendarEvent model"""
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CalendarEventFilter
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_time', 'end_time', 'created_at', 'event_type']
    ordering = ['start_time']
    
    def get_queryset(self):
        """Get calendar events for the current user"""
        return CalendarEvent.objects.filter(user=self.request.user).select_related(
            'user', 'related_task'
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return CalendarEventListSerializer
        else:
            return CalendarEventSerializer
    
    def perform_create(self, serializer):
        """Create calendar event with current user"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming events (next 7 days)"""
        now = timezone.now()
        week_ahead = now + timedelta(days=7)
        
        upcoming_events = self.get_queryset().filter(
            start_time__gte=now,
            start_time__lte=week_ahead
        ).order_by('start_time')
        
        page = self.paginate_queryset(upcoming_events)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(upcoming_events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's events"""
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_events = self.get_queryset().filter(
            start_time__gte=today_start,
            start_time__lt=today_end
        ).order_by('start_time')
        
        serializer = self.get_serializer(today_events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_date_range(self, request):
        """Get events within a specific date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'Both start_date and end_date parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_datetime = timezone.make_aware(datetime.datetime.fromisoformat(start_date))
            end_datetime = timezone.make_aware(datetime.datetime.fromisoformat(end_date))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        events = self.get_queryset().filter(
            Q(start_time__range=(start_datetime, end_datetime)) |
            Q(end_time__range=(start_datetime, end_datetime)) |
            Q(start_time__lte=start_datetime, end_time__gte=end_datetime)
        ).order_by('start_time')
        
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)


class TimeBlockFilter(filters.FilterSet):
    """Filter class for TimeBlock model"""
    
    status = filters.MultipleChoiceFilter(choices=TimeBlock.STATUS_CHOICES)
    start_from = filters.DateTimeFilter(field_name='start_time', lookup_expr='gte')
    start_to = filters.DateTimeFilter(field_name='start_time', lookup_expr='lte')
    task = filters.UUIDFilter(field_name='task__id')
    
    class Meta:
        model = TimeBlock
        fields = ['status', 'start_from', 'start_to', 'task']


class TimeBlockViewSet(viewsets.ModelViewSet):
    """ViewSet for TimeBlock model"""
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TimeBlockFilter
    search_fields = ['task__title', 'notes']
    ordering_fields = ['start_time', 'end_time', 'created_at', 'status']
    ordering = ['start_time']
    
    def get_queryset(self):
        """Get time blocks for the current user"""
        return TimeBlock.objects.filter(user=self.request.user).select_related(
            'user', 'task'
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TimeBlockListSerializer
        else:
            return TimeBlockSerializer
    
    def perform_create(self, serializer):
        """Create time block with current user"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Mark time block as started"""
        time_block = self.get_object()
        
        if time_block.status != 'scheduled':
            return Response(
                {'error': 'Time block must be in scheduled status to start'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_block.status = 'in_progress'
        time_block.actual_start_time = timezone.now()
        time_block.save()
        
        # Also update task status
        task = time_block.task
        if task.status == 'pending':
            task.status = 'in_progress'
            task.save()
        
        serializer = self.get_serializer(time_block)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark time block as completed"""
        time_block = self.get_object()
        
        if time_block.status not in ['scheduled', 'in_progress']:
            return Response(
                {'error': 'Time block must be in scheduled or in progress status to complete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_block.status = 'completed'
        time_block.actual_end_time = timezone.now()
        
        # Set actual start time if not set
        if not time_block.actual_start_time:
            time_block.actual_start_time = time_block.start_time
        
        time_block.save()
        
        # Ask if task should be marked as completed
        complete_task = request.data.get('complete_task', False)
        if complete_task:
            task = time_block.task
            task.status = 'completed'
            task.save()
        
        serializer = self.get_serializer(time_block)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's time blocks"""
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_blocks = self.get_queryset().filter(
            start_time__gte=today_start,
            start_time__lt=today_end
        ).order_by('start_time')
        
        serializer = self.get_serializer(today_blocks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """Get time blocks for a specific date"""
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response(
                {'error': 'Date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            date_obj = datetime.datetime.fromisoformat(date_str)
            date_start = timezone.make_aware(datetime.datetime.combine(date_obj.date(), datetime.time.min))
            date_end = date_start + timedelta(days=1)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid date format. Use ISO format (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        blocks = self.get_queryset().filter(
            start_time__gte=date_start,
            start_time__lt=date_end
        ).order_by('start_time')
        
        serializer = self.get_serializer(blocks, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_data(request):
    """Get dashboard data including tasks, stats, and recent activity"""
    try:
        user = request.user
        now = timezone.now()
        
        # Get recent tasks (last 10)
        recent_tasks = Task.objects.filter(user=user).order_by('-created_at')[:10]
        recent_tasks_data = TaskListSerializer(recent_tasks, many=True).data
        
        # Get overdue tasks
        overdue_tasks = Task.objects.filter(
            user=user,
            deadline__lt=now,
            status__in=['pending', 'in_progress']
        ).order_by('deadline')[:5]
        overdue_tasks_data = TaskListSerializer(overdue_tasks, many=True).data
        
        # Get upcoming tasks (next 7 days)
        week_ahead = now + timedelta(days=7)
        upcoming_tasks = Task.objects.filter(
            user=user,
            deadline__gte=now,
            deadline__lte=week_ahead,
            status__in=['pending', 'in_progress']
        ).order_by('deadline')[:5]
        upcoming_tasks_data = TaskListSerializer(upcoming_tasks, many=True).data
        
        # Get high priority tasks
        high_priority_tasks = Task.objects.filter(
            user=user,
            status__in=['pending', 'in_progress']
        ).filter(
            Q(priority__in=['high', 'urgent']) | Q(ai_priority_score__gte=7.0)
        ).order_by('-ai_priority_score')[:5]
        high_priority_data = TaskListSerializer(high_priority_tasks, many=True).data
        
        # Get recent context entries
        recent_context = ContextEntry.objects.filter(
            user=user
        ).order_by('-created_at')[:5]
        recent_context_data = ContextEntrySerializer(recent_context, many=True).data
        
        # Basic stats
        total_tasks = Task.objects.filter(user=user).count()
        pending_tasks = Task.objects.filter(user=user, status='pending').count()
        completed_today = Task.objects.filter(
            user=user,
            status='completed',
            completed_at__date=now.date()
        ).count()
        
        dashboard_data = {
            'stats': {
                'total_tasks': total_tasks,
                'pending_tasks': pending_tasks,
                'overdue_tasks': len(overdue_tasks_data),
                'completed_today': completed_today
            },
            'recent_tasks': recent_tasks_data,
            'overdue_tasks': overdue_tasks_data,
            'upcoming_tasks': upcoming_tasks_data,
            'high_priority_tasks': high_priority_data,
            'recent_context': recent_context_data
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        return Response(
            {'error': 'Failed to get dashboard data', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_tasks(request):
    """Bulk update multiple tasks"""
    try:
        data = request.data
        task_ids = data.get('task_ids', [])
        updates = data.get('updates', {})
        
        if not task_ids or not updates:
            return Response(
                {'error': 'Task IDs and updates are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get tasks
        tasks = Task.objects.filter(
            id__in=task_ids,
            user=request.user
        )
        
        if not tasks.exists():
            return Response(
                {'error': 'No valid tasks found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Apply updates
        updated_count = 0
        for task in tasks:
            for field, value in updates.items():
                if hasattr(task, field) and field not in ['id', 'user', 'created_at']:
                    setattr(task, field, value)
            task.save()
            updated_count += 1
        
        return Response({
            'message': f'Successfully updated {updated_count} tasks',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in bulk update: {str(e)}")
        return Response(
            {'error': 'Failed to bulk update tasks', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def bulk_delete_tasks(request):
    """Bulk delete multiple tasks"""
    try:
        data = request.data
        task_ids = data.get('task_ids', [])
        
        if not task_ids:
            return Response(
                {'error': 'Task IDs are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get and delete tasks
        tasks = Task.objects.filter(
            id__in=task_ids,
            user=request.user
        )
        
        deleted_count = tasks.count()
        tasks.delete()
        
        return Response({
            'message': f'Successfully deleted {deleted_count} tasks',
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in bulk delete: {str(e)}")
        return Response(
            {'error': 'Failed to bulk delete tasks', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_scheduling_suggestions(request):
    """
    Generate AI-powered scheduling suggestions for a task
    
    Request data should include:
    - task: Task data including title, description, priority, deadline, etc.
    - calendar_events: Optional list of existing calendar events
    - time_blocks: Optional list of existing time blocks
    - start_date: Start date for scheduling window (optional)
    - end_date: End date for scheduling window (optional)
    
    Returns scheduling suggestions with start and end times
    """
    try:
        user = request.user
        data = request.data
        task_data = data.get('task', {})
        
        # Get current date and time
        now = timezone.now()
        
        # Get start and end dates for scheduling window
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date:
            try:
                start_date = datetime.datetime.fromisoformat(start_date)
                start_date = timezone.make_aware(datetime.datetime.combine(start_date, datetime.time.min))
            except (ValueError, TypeError):
                start_date = now
        else:
            start_date = now
        
        if end_date:
            try:
                end_date = datetime.datetime.fromisoformat(end_date)
                end_date = timezone.make_aware(datetime.datetime.combine(end_date, datetime.time.min))
                end_date = end_date + timedelta(days=1) - timedelta(microseconds=1)  # End of day
            except (ValueError, TypeError):
                end_date = start_date + timedelta(days=7)
        else:
            end_date = start_date + timedelta(days=7)
        
        # Get existing calendar events and time blocks if not provided
        calendar_events = data.get('calendar_events', [])
        time_blocks = data.get('time_blocks', [])
        
        if not calendar_events:
            # Fetch calendar events for the date range
            calendar_events = CalendarEvent.objects.filter(
                user=user,
                start_time__gte=start_date,
                start_time__lt=end_date
            ).order_by('start_time')
            calendar_events = CalendarEventSerializer(calendar_events, many=True).data
        
        if not time_blocks:
            # Fetch time blocks for the date range
            time_blocks = TimeBlock.objects.filter(
                user=user,
                start_time__gte=start_date,
                start_time__lt=end_date
            ).order_by('start_time')
            time_blocks = TimeBlockSerializer(time_blocks, many=True).data
        
        # Extract task details
        task_title = task_data.get('title', '')
        task_description = task_data.get('description', '')
        task_priority = task_data.get('priority', 'medium')
        task_deadline = task_data.get('deadline')
        task_estimated_duration = task_data.get('estimated_duration', 60)  # Default 1 hour
        
        # Convert estimated duration to minutes if needed
        if isinstance(task_estimated_duration, str):
            try:
                task_estimated_duration = int(task_estimated_duration)
            except (ValueError, TypeError):
                task_estimated_duration = 60
        
        # Define working hours (9 AM - 5 PM by default)
        working_start_hour = 9
        working_end_hour = 17
        
        # Calculate suggested start time based on priority and deadline
        suggested_start_time = now
        
        # If high priority, schedule soon (within next 24 hours)
        if task_priority == 'high':
            suggested_start_time = now + timedelta(hours=1)
        # If medium priority, schedule within next 48 hours
        elif task_priority == 'medium':
            suggested_start_time = now + timedelta(hours=24)
        # If low priority, schedule within next week
        else:
            suggested_start_time = now + timedelta(hours=72)
        
        # If there's a deadline, make sure we schedule before it
        if task_deadline:
            try:
                deadline = datetime.datetime.fromisoformat(task_deadline)
                if isinstance(deadline, datetime.date) and not isinstance(deadline, datetime.datetime):
                    deadline = datetime.datetime.combine(deadline, datetime.time(23, 59, 59))
                deadline = timezone.make_aware(deadline)
                
                # If deadline is before our suggested time, adjust
                if deadline < suggested_start_time:
                    # Schedule based on priority and deadline
                    if task_priority == 'high':
                        suggested_start_time = deadline - timedelta(hours=24)
                    elif task_priority == 'medium':
                        suggested_start_time = deadline - timedelta(hours=48)
                    else:
                        suggested_start_time = deadline - timedelta(hours=72)
            except (ValueError, TypeError):
                pass  # Invalid deadline format, ignore
        
        # Ensure start time is during working hours (9 AM - 5 PM)
        if suggested_start_time.hour < working_start_hour:
            suggested_start_time = suggested_start_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
        elif suggested_start_time.hour >= working_end_hour:
            # Move to 9 AM next day
            suggested_start_time = suggested_start_time + timedelta(days=1)
            suggested_start_time = suggested_start_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
        
        # Check for conflicts with existing calendar events and time blocks
        conflicts = []
        
        # Calculate end time based on duration
        suggested_end_time = suggested_start_time + timedelta(minutes=task_estimated_duration)
        
        # If end time exceeds working hours, adjust to next day
        if suggested_end_time.hour >= working_end_hour:
            # If task is short enough to fit in remaining time before end of day
            if suggested_end_time.hour == working_end_hour and suggested_end_time.minute <= 30:
                # Keep it as is, it's close enough to end of day
                pass
            else:
                # Move to next day
                suggested_start_time = suggested_start_time + timedelta(days=1)
                suggested_start_time = suggested_start_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                suggested_end_time = suggested_start_time + timedelta(minutes=task_estimated_duration)
        
        # Ensure we're not scheduling on weekends
        day_of_week = suggested_start_time.weekday()
        if day_of_week == 5:  # Saturday
            suggested_start_time = suggested_start_time + timedelta(days=2)  # Move to Monday
            suggested_start_time = suggested_start_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
            suggested_end_time = suggested_start_time + timedelta(minutes=task_estimated_duration)
        elif day_of_week == 6:  # Sunday
            suggested_start_time = suggested_start_time + timedelta(days=1)  # Move to Monday
            suggested_start_time = suggested_start_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
            suggested_end_time = suggested_start_time + timedelta(minutes=task_estimated_duration)
        
        # Check for conflicts with existing calendar events
        for event in calendar_events:
            event_start = datetime.datetime.fromisoformat(event['start_time'])
            event_end = datetime.datetime.fromisoformat(event['end_time'])
            
            # Check if our suggested time overlaps with this event
            if (suggested_start_time <= event_end and suggested_end_time >= event_start):
                conflicts.append({
                    'type': 'calendar_event',
                    'title': event['title'],
                    'start_time': event['start_time'],
                    'end_time': event['end_time']
                })
        
        # Check for conflicts with existing time blocks
        for block in time_blocks:
            block_start = datetime.datetime.fromisoformat(block['start_time'])
            block_end = datetime.datetime.fromisoformat(block['end_time'])
            
            # Check if our suggested time overlaps with this time block
            if (suggested_start_time <= block_end and suggested_end_time >= block_start):
                conflicts.append({
                    'type': 'time_block',
                    'title': block.get('task_title', 'Time Block'),
                    'start_time': block['start_time'],
                    'end_time': block['end_time']
                })
        
        # If there are conflicts, try to find a new time slot
        if conflicts:
            # Sort all events and time blocks by start time
            all_items = []
            for event in calendar_events:
                all_items.append({
                    'start': datetime.datetime.fromisoformat(event['start_time']),
                    'end': datetime.datetime.fromisoformat(event['end_time'])
                })
            
            for block in time_blocks:
                all_items.append({
                    'start': datetime.datetime.fromisoformat(block['start_time']),
                    'end': datetime.datetime.fromisoformat(block['end_time'])
                })
            
            all_items.sort(key=lambda x: x['start'])
            
            # Find gaps between events that can fit our task
            current_time = max(now, start_date.replace(hour=working_start_hour, minute=0, second=0, microsecond=0))
            end_search_time = min(end_date, start_date + timedelta(days=14))  # Look up to 2 weeks ahead
            
            while current_time < end_search_time:
                # Skip to next working day if current time is on weekend or after working hours
                day_of_week = current_time.weekday()
                current_hour = current_time.hour
                
                if day_of_week >= 5:  # Weekend
                    # Skip to Monday
                    days_to_add = 7 - day_of_week
                    current_time = current_time + timedelta(days=days_to_add)
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                    continue
                
                if current_hour >= working_end_hour:
                    # Skip to next day
                    current_time = current_time + timedelta(days=1)
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                    continue
                
                if current_hour < working_start_hour:
                    # Skip to working hours
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                
                # Calculate potential end time
                potential_end_time = current_time + timedelta(minutes=task_estimated_duration)
                
                # Check if this time slot works
                if potential_end_time.hour >= working_end_hour:
                    # Skip to next day if it would exceed working hours
                    current_time = current_time + timedelta(days=1)
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                    continue
                
                # Check for conflicts
                has_conflict = False
                for item in all_items:
                    if current_time < item['end'] and potential_end_time > item['start']:
                        has_conflict = True
                        # Move time to after this event
                        current_time = item['end']
                        break
                
                if not has_conflict:
                    # We found a suitable time slot!
                    suggested_start_time = current_time
                    suggested_end_time = potential_end_time
                    break
                
                # If we still have conflicts, continue searching
                if has_conflict and current_time >= end_search_time:
                    # We couldn't find a suitable time slot, keep the original suggestion
                    # but note the conflicts
                    pass
        
        # Prepare response
        response_data = {
            'suggested_start_time': suggested_start_time.isoformat(),
            'suggested_end_time': suggested_end_time.isoformat(),
            'conflicts': conflicts,
            'reasoning': f"Scheduling based on task priority ({task_priority}) and estimated duration ({task_estimated_duration} minutes).",
            'confidence_score': 0.8 if not conflicts else 0.6
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in AI scheduling suggestions: {str(e)}")
        return Response(
            {'error': 'Failed to generate scheduling suggestions', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def optimize_schedule(request):
    """
    Optimize scheduling for multiple tasks
    
    Request data should include:
    - tasks: List of task objects to schedule
    
    Returns optimized schedule with suggested times for each task
    """
    try:
        user = request.user
        data = request.data
        tasks = data.get('tasks', [])
        
        if not tasks:
            return Response(
                {'error': 'No tasks provided for scheduling'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current date and time
        now = timezone.now()
        
        # Define scheduling window (next 2 weeks)
        start_date = now
        end_date = now + timedelta(days=14)
        
        # Get existing calendar events and time blocks
        calendar_events = CalendarEvent.objects.filter(
            user=user,
            start_time__gte=start_date,
            start_time__lt=end_date
        ).order_by('start_time')
        calendar_events_data = CalendarEventSerializer(calendar_events, many=True).data
        
        time_blocks = TimeBlock.objects.filter(
            user=user,
            start_time__gte=start_date,
            start_time__lt=end_date
        ).order_by('start_time')
        time_blocks_data = TimeBlockSerializer(time_blocks, many=True).data
        
        # Sort tasks by priority and deadline
        priority_map = {'high': 3, 'medium': 2, 'low': 1}
        
        def task_sort_key(task):
            task_priority = priority_map.get(task.get('priority', 'medium'), 2)
            
            # Parse deadline if it exists
            task_deadline = None
            deadline_str = task.get('deadline')
            if deadline_str:
                try:
                    task_deadline = datetime.datetime.fromisoformat(deadline_str)
                except (ValueError, TypeError):
                    pass
            
            # Return tuple for sorting (priority first, then deadline)
            return (-task_priority, task_deadline or datetime.datetime.max)
        
        sorted_tasks = sorted(tasks, key=task_sort_key)
        
        # Build schedule
        schedule = []
        scheduled_items = calendar_events_data + time_blocks_data
        
        # Define working hours
        working_start_hour = 9
        working_end_hour = 17
        
        for task in sorted_tasks:
            task_id = task.get('id')
            task_title = task.get('title', 'Untitled Task')
            task_priority = task.get('priority', 'medium')
            task_deadline_str = task.get('deadline')
            task_estimated_duration = int(task.get('estimated_duration', 60))  # Default 1 hour
            
            # Parse deadline if it exists
            task_deadline = None
            if task_deadline_str:
                try:
                    task_deadline = datetime.datetime.fromisoformat(task_deadline_str)
                    if isinstance(task_deadline, datetime.date) and not isinstance(task_deadline, datetime.datetime):
                        task_deadline = datetime.datetime.combine(task_deadline, datetime.time(23, 59, 59))
                    task_deadline = timezone.make_aware(task_deadline)
                except (ValueError, TypeError):
                    pass
            
            # Calculate initial suggested start time based on priority
            suggested_start_time = now
            if task_priority == 'high':
                suggested_start_time = now + timedelta(hours=1)
            elif task_priority == 'medium':
                suggested_start_time = now + timedelta(hours=24)
            else:  # low priority
                suggested_start_time = now + timedelta(hours=72)
            
            # If there's a deadline, adjust start time if needed
            if task_deadline and task_deadline < suggested_start_time:
                # Schedule based on priority and deadline
                if task_priority == 'high':
                    suggested_start_time = task_deadline - timedelta(hours=24)
                elif task_priority == 'medium':
                    suggested_start_time = task_deadline - timedelta(hours=48)
                else:
                    suggested_start_time = task_deadline - timedelta(hours=72)
            
            # Find a suitable time slot
            current_time = suggested_start_time
            end_search_time = end_date
            
            while current_time < end_search_time:
                # Skip to next working day if current time is on weekend or after working hours
                day_of_week = current_time.weekday()
                current_hour = current_time.hour
                
                if day_of_week >= 5:  # Weekend
                    # Skip to Monday
                    days_to_add = 7 - day_of_week
                    current_time = current_time + timedelta(days=days_to_add)
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                    continue
                
                if current_hour >= working_end_hour:
                    # Skip to next day
                    current_time = current_time + timedelta(days=1)
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                    continue
                
                if current_hour < working_start_hour:
                    # Skip to working hours
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                
                # Calculate potential end time
                potential_end_time = current_time + timedelta(minutes=task_estimated_duration)
                
                # Check if this time slot works
                if potential_end_time.hour >= working_end_hour:
                    # Skip to next day if it would exceed working hours
                    current_time = current_time + timedelta(days=1)
                    current_time = current_time.replace(hour=working_start_hour, minute=0, second=0, microsecond=0)
                    continue
                
                # Check for conflicts with existing scheduled items
                has_conflict = False
                for item in scheduled_items:
                    item_start = datetime.datetime.fromisoformat(item['start_time'])
                    item_end = datetime.datetime.fromisoformat(item['end_time'])
                    
                    if current_time < item_end and potential_end_time > item_start:
                        has_conflict = True
                        # Move time to after this event
                        current_time = item_end
                        break
                
                if not has_conflict:
                    # We found a suitable time slot!
                    suggested_start_time = current_time
                    suggested_end_time = potential_end_time
                    
                    # Add this task to our schedule
                    schedule.append({
                        'task_id': task_id,
                        'task_title': task_title,
                        'suggested_start_time': suggested_start_time.isoformat(),
                        'suggested_end_time': suggested_end_time.isoformat(),
                        'priority': task_priority,
                        'estimated_duration': task_estimated_duration,
                        'reasoning': f"Scheduled based on priority ({task_priority}) and available time slots."
                    })
                    
                    # Add this task to our scheduled items to avoid conflicts with later tasks
                    scheduled_items.append({
                        'start_time': suggested_start_time.isoformat(),
                        'end_time': suggested_end_time.isoformat()
                    })
                    
                    break
                
                # If we still have conflicts and have reached the end of our search window
                if has_conflict and current_time >= end_search_time:
                    # We couldn't find a suitable time slot, schedule at the end
                    suggested_start_time = end_search_time
                    suggested_end_time = suggested_start_time + timedelta(minutes=task_estimated_duration)
                    
                    schedule.append({
                        'task_id': task_id,
                        'task_title': task_title,
                        'suggested_start_time': suggested_start_time.isoformat(),
                        'suggested_end_time': suggested_end_time.isoformat(),
                        'priority': task_priority,
                        'estimated_duration': task_estimated_duration,
                        'reasoning': "Could not find conflict-free time slot within scheduling window."
                    })
                    break
        
        return Response({'schedule': schedule})
        
    except Exception as e:
        logger.error(f"Error in optimize schedule: {str(e)}")
        return Response(
            {'error': 'Failed to optimize schedule', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

