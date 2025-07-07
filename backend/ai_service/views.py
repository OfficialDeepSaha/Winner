"""
AI Service Views for Smart Todo List Application

This module provides REST API endpoints for AI-powered features:
- Context analysis
- Task prioritization
- Deadline suggestions
- Category and tag suggestions
- Task enhancement
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from tasks.models import Task, ContextEntry, Category, Tag
from .ai_core import ai_manager
from .utils import (
    ContextProcessor, WorkloadAnalyzer, AIAnalysisLogger, 
    run_async_ai_analysis, measure_processing_time,
    CategoryTagManager
)
import json


logger = logging.getLogger('ai_service')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_context(request):
    """
    Analyze daily context (messages, emails, notes) for insights
    
    Expected payload:
    {
        "content": "Context content to analyze",
        "source_type": "whatsapp|email|notes|calendar|other",
        "content_date": "2024-01-15T10:00:00Z" (optional)
    }
    """
    try:
        data = request.data
        content = data.get('content', '').strip()
        source_type = data.get('source_type', 'other')
        content_date = data.get('content_date')
        
        if not content:
            return Response(
                {'error': 'Content is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse content date if provided
        parsed_date = None
        if content_date:
            try:
                from django.utils.dateparse import parse_datetime
                parsed_date = parse_datetime(content_date)
            except (ValueError, TypeError):
                parsed_date = None
        
        # Create context entry
        context_entry = ContextEntry.objects.create(
            user=request.user,
            content=content,
            source_type=source_type,
            content_date=parsed_date or timezone.now()
        )
        
        # Analyze context with AI
        @measure_processing_time
        def analyze():
            return run_async_ai_analysis(
                ai_manager.ai_service.analyze_context(content, source_type)
            )
        
        analysis_result, processing_time = analyze()
        
        # Update context entry with analysis results
        context_entry.processed_insights = analysis_result.summary
        context_entry.extracted_tasks = analysis_result.potential_tasks
        context_entry.sentiment_score = analysis_result.sentiment_score
        context_entry.urgency_indicators = analysis_result.urgency_indicators
        context_entry.is_processed = True
        context_entry.processed_at = timezone.now()
        context_entry.save()
        
        # Log the analysis
        AIAnalysisLogger.log_analysis(
            user=request.user,
            analysis_type='context_analysis',
            input_data={'content': content[:500], 'source_type': source_type},
            output_data={
                'summary': analysis_result.summary,
                'key_topics': analysis_result.key_topics,
                'potential_tasks_count': len(analysis_result.potential_tasks)
            },
            processing_time=processing_time,
            success=True
        )
        
        return Response({
            'context_id': str(context_entry.id),
            'analysis': {
                'summary': analysis_result.summary,
                'key_topics': analysis_result.key_topics,
                'urgency_indicators': analysis_result.urgency_indicators,
                'potential_tasks': analysis_result.potential_tasks,
                'sentiment_score': analysis_result.sentiment_score,
                'time_references': analysis_result.time_references
            },
            'processing_time': processing_time
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in analyze_context: {str(e)}")
        
        # Log the error
        AIAnalysisLogger.log_analysis(
            user=request.user,
            analysis_type='context_analysis',
            input_data={'content': content[:500] if 'content' in locals() else '', 'source_type': source_type if 'source_type' in locals() else ''},
            error_message=str(e),
            success=False
        )
        
        return Response(
            {'error': 'Failed to analyze context', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_ai_task_suggestions(request):
    """
    Get AI-powered task suggestions and prioritization
    
    Expected payload:
    {
        "task": {
            "title": "Task title",
            "description": "Task description",
            "category": "Category name (optional)",
            "priority": "low|medium|high|urgent (optional)",
            "deadline": "2024-01-15T14:00:00Z (optional)",
            "estimated_duration": 60 (optional, in minutes)
        },
        "include_context": true (optional, default: true),
        "context_days_back": 7 (optional, default: 7)
    }
    """
    try:
        data = request.data
        task_data = data.get('task', {})
        include_context = data.get('include_context', True)
        context_days_back = data.get('context_days_back', 7)
        
        if not task_data.get('title'):
            return Response(
                {'error': 'Task title is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get relevant context if requested
        context_data = []
        if include_context:
            context_data = ContextProcessor.get_relevant_context(
                request.user, task_data, context_days_back
            )
        
        # Get current workload
        current_workload = WorkloadAnalyzer.get_current_workload(request.user)
        
        # Get existing categories and tags
        existing_categories = CategoryTagManager.get_popular_categories()
        existing_tags = CategoryTagManager.get_popular_tags()
        
        # Get user preferences (can be extended later)
        user_preferences = {}
        
        # Process task with AI
        @measure_processing_time
        def process_task():
            return run_async_ai_analysis(
                ai_manager.process_new_task(
                    task_data=task_data,
                    context_data=context_data,
                    user_preferences=user_preferences,
                    existing_categories=existing_categories,
                    existing_tags=existing_tags,
                    current_workload=current_workload
                )
            )
        
        ai_results, processing_time = process_task()
        
        # Add detailed logging of AI suggestions
        logger.info("=================== AI SUGGESTIONS LOG ====================")
        logger.info(f"Task: {task_data.get('title')}")
        logger.info(f"Complete AI results: {json.dumps(ai_results, indent=2, default=str)}")
        
        # Log specific suggestion types
        if 'priority' in ai_results:
            logger.info(f"PRIORITY SUGGESTION: {json.dumps(ai_results['priority'], indent=2, default=str)}")
        else:
            logger.info("PRIORITY SUGGESTION: Not available")
            
        if 'deadline' in ai_results:
            logger.info(f"DEADLINE SUGGESTION: {json.dumps(ai_results['deadline'], indent=2, default=str)}")
        else:
            logger.info("DEADLINE SUGGESTION: Not available")
            
        if 'scheduling' in ai_results:
            logger.info(f"SCHEDULING SUGGESTION: {json.dumps(ai_results['scheduling'], indent=2, default=str)}")
        else:
            logger.info("SCHEDULING SUGGESTION: Not available")
            
        if 'categorization' in ai_results:
            logger.info(f"CATEGORY SUGGESTION: {json.dumps(ai_results['categorization'], indent=2, default=str)}")
        else:
            logger.info("CATEGORY SUGGESTION: Not available")
            
        if 'enhanced_description' in ai_results and ai_results['enhanced_description']:
            logger.info(f"ENHANCED DESCRIPTION: {ai_results['enhanced_description']}")
        else:
            logger.info("ENHANCED DESCRIPTION: Not available")
            
        # Log enhanced description info if available
        if 'enhanced_description_info' in ai_results:
            logger.info(f"ENHANCED DESCRIPTION INFO: {json.dumps(ai_results['enhanced_description_info'], indent=2, default=str)}")
            # If there was an error, log it clearly
            if not ai_results['enhanced_description_info'].get('is_enhanced', False):
                logger.warning(f"Enhanced description generation failed: {ai_results['enhanced_description_info'].get('error', 'Unknown error')}")
                # Make sure we're not sending None to the frontend
                if ai_results.get('enhanced_description') is None:
                    ai_results['enhanced_description'] = ai_results['enhanced_description_info'].get('original_text', '')
        logger.info("=============================================================")
        
        # Log the analysis
        AIAnalysisLogger.log_analysis(
            user=request.user,
            analysis_type='task_suggestions',
            input_data={
                'task_title': task_data.get('title', ''),
                'include_context': include_context,
                'context_entries_count': len(context_data)
            },
            output_data=ai_results,
            processing_time=processing_time,
            success='error' not in ai_results
        )
        
        # Format the response properly with all required fields
        task_suggestions = {}
        
        # Ensure priority is included
        if 'priority' in ai_results:
            task_suggestions['priority'] = ai_results['priority']
        else:
            # Add default priority if missing
            task_suggestions['priority'] = {
                'score': 5.0,
                'priority_label': 'Medium',
                'reasoning': 'Default priority assigned as suggestion was not available',
                'urgency_factors': ['Task requires attention'],
                'context_relevance': 0.5,
                'action_timeframe': 'As scheduled',
                'impact_assessment': 'Normal impact on workflow'
            }
            
        # Ensure deadline is included
        if 'deadline' in ai_results:
            task_suggestions['deadline'] = ai_results['deadline']
            
        # Ensure scheduling is included
        if 'scheduling' in ai_results:
            task_suggestions['scheduling'] = ai_results['scheduling']
        else:
            # Add default scheduling if missing
            tomorrow = timezone.now() + timezone.timedelta(days=1)
            tomorrow = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)  # 10:00 AM
            task_suggestions['scheduling'] = {
                'suggested_start_time': tomorrow.isoformat(),
                'suggested_end_time': (tomorrow + timezone.timedelta(hours=1)).isoformat(),
                'confidence': 0.5,
                'reasoning': 'Default scheduling as suggestion was not available',
                'factors_considered': ['Task priority', 'Estimated duration'],
                'alternative_slots': [{
                    'start_time': (tomorrow + timezone.timedelta(hours=2)).isoformat(),
                    'end_time': (tomorrow + timezone.timedelta(hours=3)).isoformat(),
                    'reason': 'Alternative time slot'
                }]
            }
            
        # Ensure categorization is included
        if 'categorization' in ai_results:
            task_suggestions['categorization'] = ai_results['categorization']
            
        # Ensure enhanced description is included
        if 'enhanced_description' in ai_results:
            task_suggestions['enhanced_description'] = ai_results['enhanced_description']
        else:
            # Use original description as fallback
            task_suggestions['enhanced_description'] = task_data.get('description', '')
        
        response_data = {
            'task_suggestions': task_suggestions,
            'context_used': len(context_data) if context_data else 0,
            'workload_analysis': current_workload,
            'processing_time': processing_time
        }
        
        # Log the final response being sent to frontend
        logger.info(f"Response sent to frontend: {json.dumps(response_data, indent=2, default=str)}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_ai_task_suggestions: {str(e)}")
        
        # Log the error
        AIAnalysisLogger.log_analysis(
            user=request.user,
            analysis_type='task_suggestions',
            input_data={'task_title': task_data.get('title', '') if 'task_data' in locals() else ''},
            error_message=str(e),
            success=False
        )
        
        return Response(
            {'error': 'Failed to get AI task suggestions', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def prioritize_tasks(request):
    """
    Prioritize multiple tasks using AI analysis
    
    Expected payload:
    {
        "task_ids": ["uuid1", "uuid2", "uuid3"],
        "include_context": true (optional, default: true)
    }
    """
    try:
        data = request.data
        task_ids = data.get('task_ids', [])
        include_context = data.get('include_context', True)
        
        if not task_ids:
            return Response(
                {'error': 'Task IDs are required'}, 
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
        
        prioritized_tasks = []
        total_processing_time = 0
        
        for task in tasks:
            try:
                # Prepare task data
                task_data = {
                    'title': task.title,
                    'description': task.description,
                    'category': task.category.name if task.category else None,
                    'priority': task.priority,
                    'deadline': task.deadline.isoformat() if task.deadline else None,
                    'estimated_duration': task.estimated_duration
                }
                
                # Get relevant context if requested
                context_data = []
                if include_context:
                    context_data = ContextProcessor.get_relevant_context(
                        request.user, task_data, days_back=7, max_entries=5
                    )
                
                # Prioritize task with AI
                @measure_processing_time
                def prioritize():
                    return run_async_ai_analysis(
                        ai_manager.ai_service.prioritize_task(
                            task_data, context_data
                        )
                    )
                
                priority_result, processing_time = prioritize()
                total_processing_time += processing_time
                
                # Update task with AI priority
                task.ai_priority_score = priority_result.score
                task.ai_reasoning = priority_result.reasoning
                task.last_ai_analysis = timezone.now()
                task.save()
                
                prioritized_tasks.append({
                    'task_id': str(task.id),
                    'title': task.title,
                    'current_priority': task.priority,
                    'ai_priority_score': priority_result.score,
                    'reasoning': priority_result.reasoning,
                    'urgency_factors': priority_result.urgency_factors,
                    'context_relevance': priority_result.context_relevance
                })
                
            except Exception as e:
                logger.error(f"Error prioritizing task {task.id}: {str(e)}")
                prioritized_tasks.append({
                    'task_id': str(task.id),
                    'title': task.title,
                    'error': str(e)
                })
        
        # Sort by AI priority score
        prioritized_tasks.sort(key=lambda x: x.get('ai_priority_score', 0), reverse=True)
        
        # Log the analysis
        AIAnalysisLogger.log_analysis(
            user=request.user,
            analysis_type='task_prioritization',
            input_data={'task_count': len(task_ids)},
            output_data={'prioritized_tasks_count': len(prioritized_tasks)},
            processing_time=total_processing_time,
            success=True
        )
        
        return Response({
            'prioritized_tasks': prioritized_tasks,
            'total_processing_time': total_processing_time
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in prioritize_tasks: {str(e)}")
        
        # Log the error
        AIAnalysisLogger.log_analysis(
            user=request.user,
            analysis_type='task_prioritization',
            input_data={'task_count': len(task_ids) if 'task_ids' in locals() else 0},
            error_message=str(e),
            success=False
        )
        
        return Response(
            {'error': 'Failed to prioritize tasks', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_context_insights(request):
    """
    Get insights from recent context entries
    
    Query parameters:
    - days_back: Number of days to look back (default: 7)
    - source_type: Filter by source type (optional)
    - limit: Maximum number of entries to analyze (default: 20)
    """
    try:
        days_back = int(request.GET.get('days_back', 7))
        source_type = request.GET.get('source_type')
        limit = int(request.GET.get('limit', 20))
        
        # Get context entries
        context_filter = {
            'user': request.user,
            'created_at__gte': timezone.now() - timezone.timedelta(days=days_back)
        }
        
        if source_type:
            context_filter['source_type'] = source_type
        
        # First, get counts before slicing the queryset
        queryset = ContextEntry.objects.filter(**context_filter)
        total_entries = queryset.count()
        
        if total_entries == 0:
            return Response({
                'insights': {
                    'total_entries': 0,
                    'processed_entries': 0,
                    'key_topics': [],
                    'urgency_indicators': [],
                    'potential_tasks': [],
                    'average_sentiment': 0.0
                }
            }, status=status.HTTP_200_OK)
        
        # Count processed entries before slicing
        processed_entries = queryset.filter(is_processed=True).count()
        
        # Now get the limited set for detailed processing - only include processed entries
        context_entries = queryset.filter(is_processed=True).order_by('-created_at')[:limit]
        
        all_key_topics = []
        all_urgency_indicators = []
        all_potential_tasks = []
        sentiment_scores = []
        
        for entry in context_entries:
            if entry.processed_insights:
                # Extract topics from processed insights (simplified)
                insights_text = entry.processed_insights.lower()
                # This could be enhanced with proper NLP
                
            if entry.urgency_indicators:
                all_urgency_indicators.extend(entry.urgency_indicators)
                
            if entry.extracted_tasks:
                all_potential_tasks.extend(entry.extracted_tasks)
                
            if entry.sentiment_score is not None:
                sentiment_scores.append(entry.sentiment_score)
        
        # Calculate aggregated metrics
        average_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.0
        
        # Get most common topics and indicators (simplified)
        from collections import Counter
        topic_counter = Counter(all_key_topics)
        urgency_counter = Counter(all_urgency_indicators)
        
        insights = {
            'total_entries': total_entries,
            'processed_entries': processed_entries,
            'key_topics': [item[0] for item in topic_counter.most_common(10)],
            'urgency_indicators': [item[0] for item in urgency_counter.most_common(10)],
            'potential_tasks': all_potential_tasks[:10],  # Limit to 10 most recent
            'average_sentiment': average_sentiment,
            'sentiment_trend': 'positive' if average_sentiment > 0.1 else 'negative' if average_sentiment < -0.1 else 'neutral'
        }
        
        return Response({'insights': insights}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_context_insights: {str(e)}")
        return Response(
            {'error': 'Failed to get context insights', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workload_analysis(request):
    """
    Get current workload analysis for the user
    """
    try:
        workload_data = WorkloadAnalyzer.get_current_workload(request.user)
        
        # Add recommendations based on workload
        recommendations = []
        
        if workload_data['workload_level'] == 'very_high':
            recommendations.extend([
                "Consider delegating some tasks",
                "Focus on high-priority items only",
                "Reschedule non-urgent tasks"
            ])
        elif workload_data['workload_level'] == 'high':
            recommendations.extend([
                "Prioritize urgent tasks",
                "Consider extending deadlines for low-priority items"
            ])
        elif workload_data['workload_level'] == 'low':
            recommendations.extend([
                "Good time to tackle long-term projects",
                "Consider planning ahead for upcoming tasks"
            ])
        
        if workload_data['overdue_tasks'] > 0:
            recommendations.append(f"Address {workload_data['overdue_tasks']} overdue task(s) immediately")
        
        workload_data['recommendations'] = recommendations
        
        return Response({'workload': workload_data}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_workload_analysis: {str(e)}")
        return Response(
            {'error': 'Failed to get workload analysis', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ai_stats(request):
    """
    Get AI analysis statistics for the user
    
    Query parameters:
    - days_back: Number of days to look back (default: 30)
    """
    try:
        days_back = int(request.GET.get('days_back', 30))
        stats = AIAnalysisLogger.get_analysis_stats(request.user, days_back)
        
        return Response({'stats': stats}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_ai_stats: {str(e)}")
        return Response(
            {'error': 'Failed to get AI statistics', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

