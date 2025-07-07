from django.contrib import admin
from django.utils.html import format_html
from .models import Task, Category, Tag, ContextEntry, TaskContextRelation, AIAnalysisLog


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'color_display', 'usage_frequency', 'created_at']
    list_filter = ['created_at', 'usage_frequency']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'usage_frequency', 'created_at', 'updated_at']
    ordering = ['-usage_frequency', 'name']

    def color_display(self, obj):
        return format_html(
            '<span style="background-color: {}; padding: 2px 8px; border-radius: 3px; color: white;">{}</span>',
            obj.color,
            obj.color
        )
    color_display.short_description = 'Color'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'color_display', 'usage_count', 'created_at']
    list_filter = ['created_at', 'usage_count']
    search_fields = ['name']
    readonly_fields = ['id', 'usage_count', 'created_at']
    ordering = ['-usage_count', 'name']

    def color_display(self, obj):
        return format_html(
            '<span style="background-color: {}; padding: 2px 8px; border-radius: 3px; color: white;">{}</span>',
            obj.color,
            obj.color
        )
    color_display.short_description = 'Color'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'priority', 'status', 'ai_priority_score', 
        'deadline', 'category', 'created_at'
    ]
    list_filter = [
        'status', 'priority', 'category', 'created_at', 
        'deadline', 'context_processed'
    ]
    search_fields = ['title', 'description', 'user__username']
    readonly_fields = [
        'id', 'ai_priority_score', 'ai_suggested_deadline', 'ai_reasoning',
        'enhanced_description', 'context_processed', 'last_ai_analysis',
        'created_at', 'updated_at', 'completed_at'
    ]
    filter_horizontal = ['tags']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'title', 'description', 'original_description')
        }),
        ('AI Analysis', {
            'fields': (
                'enhanced_description', 'ai_priority_score', 'ai_suggested_deadline',
                'ai_reasoning', 'context_processed', 'last_ai_analysis'
            ),
            'classes': ('collapse',)
        }),
        ('User Settings', {
            'fields': ('priority', 'status', 'deadline', 'estimated_duration', 'category', 'tags')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'category').prefetch_related('tags')


@admin.register(ContextEntry)
class ContextEntryAdmin(admin.ModelAdmin):
    list_display = [
        'content_preview', 'user', 'source_type', 'is_processed', 
        'content_date', 'created_at'
    ]
    list_filter = ['source_type', 'is_processed', 'created_at', 'content_date']
    search_fields = ['content', 'user__username', 'processed_insights']
    readonly_fields = [
        'id', 'processed_insights', 'extracted_tasks', 'sentiment_score',
        'urgency_indicators', 'is_processed', 'processing_error',
        'created_at', 'processed_at'
    ]
    date_hierarchy = 'content_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'content', 'source_type', 'source_details', 'content_date')
        }),
        ('AI Processing Results', {
            'fields': (
                'processed_insights', 'extracted_tasks', 'sentiment_score',
                'urgency_indicators', 'is_processed', 'processing_error', 'processed_at'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def content_preview(self, obj):
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content Preview'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(TaskContextRelation)
class TaskContextRelationAdmin(admin.ModelAdmin):
    list_display = ['task', 'context_entry_preview', 'relevance_score', 'created_at']
    list_filter = ['relevance_score', 'created_at']
    search_fields = ['task__title', 'context_entry__content']
    readonly_fields = ['id', 'created_at']

    def context_entry_preview(self, obj):
        return obj.context_entry.content[:50] + "..." if len(obj.context_entry.content) > 50 else obj.context_entry.content
    context_entry_preview.short_description = 'Context Preview'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('task', 'context_entry')


@admin.register(AIAnalysisLog)
class AIAnalysisLogAdmin(admin.ModelAdmin):
    list_display = [
        'analysis_type', 'user', 'success', 'processing_time', 'created_at'
    ]
    list_filter = ['analysis_type', 'success', 'created_at']
    search_fields = ['user__username', 'analysis_type', 'error_message']
    readonly_fields = [
        'id', 'input_data', 'output_data', 'processing_time', 
        'error_message', 'created_at'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'analysis_type', 'success', 'processing_time', 'created_at')
        }),
        ('Data', {
            'fields': ('input_data', 'output_data', 'error_message'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

    def has_add_permission(self, request):
        return False  # Prevent manual creation of logs

    def has_change_permission(self, request, obj=None):
        return False  # Make logs read-only

