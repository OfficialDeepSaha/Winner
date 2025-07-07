"""
Views for the Analytics module of Smart Todo Application

Provides API endpoints for retrieving analytics data, productivity metrics,
and AI-generated insights.
"""

import logging
from django.utils import timezone
from django.db.models import Count, Avg, F, Sum, Q
from datetime import timedelta, datetime

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from tasks.models import Task, Category, ContextEntry
from .models import AnalyticsSnapshot, AIInsight
from .services import (
    AnalyticsService,
    ProductivityAnalyzer,
    WorkloadAnalyzer,
    AIInsightGenerator
)

logger = logging.getLogger('analytics')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_stats(request):
    """
    Get AI-generated insights and recommendations for the dashboard
    
    Parameters:
    - time_range: Number of days to look back (default: 7)
    
    Returns:
    - List of AI-generated insights based on user's tasks and context
    - Recommendations for improving productivity
    """
    try:
        time_range = int(request.query_params.get('time_range', 7))
        insight_generator = AIInsightGenerator(request.user)
        
        # Get context entries to check if there are any
        start_date = timezone.now() - timedelta(days=time_range)
        context_entries = ContextEntry.objects.filter(
            user=request.user,
            created_at__gte=start_date
        ).count()
        
        # Generate insights based on tasks and context
        insights = []
        
        # Get tasks for the user in the time range
        tasks = Task.objects.filter(
            user=request.user,
            created_at__gte=start_date
        ).count()
        
        # If there are context entries, generate insights from them
        if context_entries > 0:
            # Get context insights
            context_insights = insight_generator.generate_context_insights(time_range)
            if context_insights.get('insights'):
                insights.extend(context_insights['insights'])
        
        # Add task-based insights
        task_insights = [
            "Complete high-priority tasks first to maximize productivity",
            f"You have {context_entries} context entries in the last {time_range} days",
            f"You've created {tasks} tasks in the last {time_range} days",
            "Breaking down large tasks into smaller ones can help with progress",
            "Regular context entries help the AI provide better insights and recommendations"
        ]
        insights.extend(task_insights)
        
        # Limit to 5 insights for dashboard display
        insights = insights[:5]
        
        # Get AI stats data
        stats_data = {
            'total_ai_analyzed_tasks': 0,
            'accuracy_score': 0,
            'priority_acceptance_rate': 0,
            'deadline_acceptance_rate': 0,
            'accuracy_trend': [
                {
                    'name': (timezone.now() - timedelta(days=i)).strftime('%a'),
                    'date': (timezone.now() - timedelta(days=i)).strftime('%Y-%m-%d'),
                    'accuracy': 0
                } for i in range(time_range-1, -1, -1)
            ],
            'time_range_days': time_range
        }
        
        # Return both insights and stats data
        return Response({
            'insights': insights,
            'context_entries_count': context_entries,
            'time_range': time_range,
            'last_updated': timezone.now().isoformat(),
            **stats_data  # Include the stats data
        })
    except Exception as e:
        logger.error(f"Error generating AI stats: {str(e)}")
        return Response(
            {"error": "Failed to generate AI insights", "details": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_stats(request):
    """
    Get comprehensive task statistics for the requesting user
    
    Parameters:
    - time_range: Number of days to look back (default: 30)
    
    Returns task statistics including:
    - Total tasks
    - Completion rate
    - Priority distribution
    - Category distribution
    - Average completion time
    """
    try:
        time_range = int(request.query_params.get('time_range', 30))
        analytics_service = AnalyticsService(request.user)
        stats = analytics_service.get_task_stats(time_range)
        
        return Response(stats)
    except Exception as e:
        logger.error(f"Error getting task stats: {str(e)}")
        return Response(
            {"error": "Failed to retrieve task statistics"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workload_analysis(request):
    """
    Get AI-powered workload analysis with recommendations
    
    Returns:
    - Current workload level
    - Task distribution analysis
    - Deadline concentration
    - Recommendations for workload optimization
    """
    try:
        analyzer = WorkloadAnalyzer(request.user)
        # Set include_prioritized_tasks to False by default for this endpoint
        # for backward compatibility
        analysis = analyzer.analyze_current_workload(include_prioritized_tasks=False)
        
        return Response(analysis, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error generating workload analysis: {e}")
        return Response(
            {"error": "Could not generate workload analysis"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prioritize_tasks(request):
    """
    Get AI-powered task prioritization based on context entries and deadlines
    
    Returns:
    - List of tasks sorted by AI-determined priority
    - Each task includes AI priority score and factor breakdown
    - Recommendations for task management
    """
    try:
        # Check if we should refresh context before prioritizing
        refresh_context = request.query_params.get('refresh_context', 'false').lower() == 'true'
        
        analyzer = WorkloadAnalyzer(request.user)
        
        # Add verbose debug logging
        logger.info("Starting task prioritization for user: %s with refresh_context=%s", 
                   request.user.username, refresh_context)
        
        # Pass the refresh_context parameter to the analyzer
        analysis = analyzer.analyze_current_workload(
            include_prioritized_tasks=True,
            refresh_context=refresh_context
        )
        
        # Get settings to check if AI prioritization is enabled
        from tasks.models import UserSettings
        
        try:
            user_settings = UserSettings.objects.get(user=request.user)
            ai_prioritization_enabled = user_settings.ai_prioritization
        except UserSettings.DoesNotExist:
            # Default to enabled if settings don't exist
            ai_prioritization_enabled = True
        
        response_data = {
            'prioritized_tasks': analysis.get('prioritized_tasks', []),
            'recommendations': analysis.get('recommendations', []),
            'ai_prioritization_enabled': ai_prioritization_enabled
        }
        
        logger.info("Successfully processed task prioritization")
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Error prioritizing tasks: {e}\n{error_traceback}")
        return Response(
            {"error": "Could not prioritize tasks", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_stats(request):
    """
    Get statistics about AI accuracy and insights
    
    Parameters:
    - time_range: Number of days to look back (default: 30)
    
    Returns:
    - AI suggestion accuracy metrics
    - Acceptance rates
    - Insight generation statistics
    """
    try:
        time_range = int(request.query_params.get('time_range', 30))
        analytics_service = AnalyticsService(request.user)
        ai_stats = analytics_service.get_ai_stats(time_range)
        
        return Response(ai_stats)
    except Exception as e:
        logger.error(f"Error getting AI stats: {str(e)}")
        return Response(
            {"error": "Failed to retrieve AI statistics"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def context_insights(request):
    """
    Get AI-generated insights from the user's context data
    
    Parameters:
    - time_range: Number of days to look back (default: 30)
    
    Returns:
    - Key insights from context analysis
    - Important patterns detected
    - Recommendations based on context
    """
    try:
        time_range = int(request.query_params.get('time_range', 30))
        insight_generator = AIInsightGenerator(request.user)
        insights = insight_generator.generate_context_insights(time_range)
        
        return Response(insights)
    except Exception as e:
        logger.error(f"Error generating context insights: {str(e)}")
        return Response(
            {"error": "Failed to generate context insights"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def productivity_trend(request):
    """
    Get user productivity trends over time
    
    Parameters:
    - time_range: Number of days to look back (default: 30)
    - interval: Data point interval ('daily', 'weekly', 'monthly')
    
    Returns:
    - Productivity score over time
    - Completion rates over time
    - Work pattern analysis
    """
    try:
        time_range = int(request.query_params.get('time_range', 30))
        interval = request.query_params.get('interval', 'daily')
        
        analyzer = ProductivityAnalyzer(request.user)
        trend_data = analyzer.get_productivity_trend(time_range, interval)
        
        return Response(trend_data)
    except Exception as e:
        logger.error(f"Error retrieving productivity trend: {str(e)}")
        return Response(
            {"error": "Failed to retrieve productivity trend"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def completion_trend(request):
    """
    Get daily task creation and completion counts for the last n days
    
    Parameters:
    - days: Number of days to look back (default: 7)
    
    Returns:
    - List of daily task creation and completion counts
    - Each item contains date, created_count, completed_count
    """
    try:
        days = int(request.query_params.get('days', 7))
        
        # Calculate the date range
        end_date = timezone.now().replace(hour=23, minute=59, second=59)
        start_date = (end_date - timedelta(days=days-1)).replace(hour=0, minute=0, second=0)
        
        # Get all tasks created or completed in the date range
        tasks = Task.objects.filter(
            user=request.user
        ).filter(
            Q(created_at__range=(start_date, end_date)) | 
            Q(completed_at__range=(start_date, end_date))
        )
        
        # Initialize the result with zero counts for each day
        result = []
        current_date = start_date
        while current_date <= end_date:
            day_start = current_date.replace(hour=0, minute=0, second=0)
            day_end = current_date.replace(hour=23, minute=59, second=59)
            
            # Count tasks created and completed on this day
            created_count = tasks.filter(created_at__range=(day_start, day_end)).count()
            completed_count = tasks.filter(completed_at__range=(day_start, day_end)).count()
            
            result.append({
                'date': day_start.date().isoformat(),
                'created_count': created_count,
                'completed_count': completed_count
            })
            
            current_date += timedelta(days=1)
        
        return Response(result)
    except Exception as e:
        logger.error(f"Error retrieving completion trend: {str(e)}")
        return Response(
            {"error": "Failed to retrieve completion trend data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def productivity_trend_data(request):
    """
    Get detailed productivity trend data for the past weeks
    
    Parameters:
    - weeks: Number of weeks to look back (default: 4)
    
    Returns:
    - List of weekly productivity scores and metrics
    """
    try:
        weeks = int(request.query_params.get('weeks', 4))
        
        # Calculate the date range
        end_date = timezone.now()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Initialize result
        result = []
        
        # Calculate productivity for each week
        current_week_start = start_date
        week_number = 1
        
        while current_week_start < end_date:
            current_week_end = current_week_start + timedelta(days=7)
            
            # Get tasks for this week
            tasks = Task.objects.filter(
                user=request.user,
                created_at__range=(current_week_start, current_week_end)
            )
            
            total_tasks = tasks.count()
            completed_tasks = tasks.filter(status='completed').count()
            overdue_tasks = tasks.filter(status='overdue').count()
            
            # Calculate productivity score (simple algorithm - can be enhanced)
            completion_rate = completed_tasks / total_tasks if total_tasks > 0 else 0
            overdue_rate = overdue_tasks / total_tasks if total_tasks > 0 else 0
            
            # Base score from completion rate (0-100)
            productivity = int(completion_rate * 100)
            
            # Penalty for overdue tasks
            productivity = max(0, productivity - int(overdue_rate * 15))
            
            # Bonus for more tasks (if completed)
            if total_tasks > 5 and completion_rate > 0.7:
                productivity = min(100, productivity + 5)
            
            # Format date range for display
            date_format = '%b %d'
            date_range = f"{current_week_start.strftime(date_format)} - {current_week_end.strftime(date_format)}"
            
            result.append({
                'name': f'Week {week_number}',
                'date_range': date_range,
                'productivity': productivity,
                'completion_rate': round(completion_rate * 100, 1),
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks
            })
            
            # Move to next week
            current_week_start = current_week_end
            week_number += 1
        
        return Response(result)
    except Exception as e:
        logger.error(f"Error retrieving productivity trend: {str(e)}")
        return Response(
            {"error": "Failed to retrieve productivity trend data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
