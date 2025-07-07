"""
Utility functions for AI service operations
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from django.utils import timezone
from django.contrib.auth.models import User
from tasks.models import Task, ContextEntry, Category, Tag, TaskContextRelation, AIAnalysisLog
import time


logger = logging.getLogger('ai_service')


class ContextProcessor:
    """
    Utility class for processing and managing context data
    """
    
    @staticmethod
    def get_relevant_context(user: User, task_data: Dict[str, Any], 
                           days_back: int = 7, max_entries: int = 10) -> List[Dict[str, Any]]:
        """
        Get relevant context entries for a task based on keywords and recency
        
        Args:
            user: User object
            task_data: Task information dictionary
            days_back: Number of days to look back for context
            max_entries: Maximum number of context entries to return
            
        Returns:
            List of relevant context entry dictionaries
        """
        try:
            # Calculate date threshold
            date_threshold = timezone.now() - timedelta(days=days_back)
            
            # Get recent context entries
            context_entries = ContextEntry.objects.filter(
                user=user,
                created_at__gte=date_threshold
            ).order_by('-created_at')[:max_entries * 2]  # Get more to filter
            
            # Extract keywords from task
            task_keywords = ContextProcessor._extract_keywords(task_data)
            
            # Score and filter context entries
            scored_entries = []
            for entry in context_entries:
                relevance_score = ContextProcessor._calculate_relevance(
                    entry.content, task_keywords
                )
                if relevance_score > 0.1:  # Minimum relevance threshold
                    scored_entries.append({
                        'id': str(entry.id),
                        'content': entry.content,
                        'source_type': entry.source_type,
                        'content_date': entry.content_date or entry.created_at,
                        'relevance_score': relevance_score,
                        'processed_insights': entry.processed_insights
                    })
            
            # Sort by relevance and return top entries
            scored_entries.sort(key=lambda x: x['relevance_score'], reverse=True)
            return scored_entries[:max_entries]
            
        except Exception as e:
            logger.error(f"Error getting relevant context: {str(e)}")
            return []
    
    @staticmethod
    def _extract_keywords(task_data: Dict[str, Any]) -> List[str]:
        """
        Extract keywords from task data for context matching
        
        Args:
            task_data: Task information dictionary
            
        Returns:
            List of keywords
        """
        keywords = []
        
        # Extract from title and description
        text_fields = [
            task_data.get('title', ''),
            task_data.get('description', ''),
            task_data.get('category', '')
        ]
        
        for text in text_fields:
            if text:
                # Simple keyword extraction (can be enhanced with NLP)
                words = text.lower().split()
                # Filter out common words and short words
                filtered_words = [
                    word.strip('.,!?;:()[]{}"\'-') 
                    for word in words 
                    if len(word) > 3 and word not in [
                        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 
                        'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day',
                        'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new',
                        'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she',
                        'use', 'way', 'will', 'with', 'this', 'that', 'have',
                        'from', 'they', 'know', 'want', 'been', 'good', 'much',
                        'some', 'time', 'very', 'when', 'come', 'here', 'just',
                        'like', 'long', 'make', 'many', 'over', 'such', 'take',
                        'than', 'them', 'well', 'were'
                    ]
                ]
                keywords.extend(filtered_words)
        
        return list(set(keywords))  # Remove duplicates
    
    @staticmethod
    def _calculate_relevance(content: str, keywords: List[str]) -> float:
        """
        Calculate relevance score between content and keywords
        
        Args:
            content: Content text to analyze
            keywords: List of keywords to match
            
        Returns:
            Relevance score between 0 and 1
        """
        if not keywords or not content:
            return 0.0
        
        content_lower = content.lower()
        matches = 0
        total_keywords = len(keywords)
        
        for keyword in keywords:
            if keyword.lower() in content_lower:
                matches += 1
        
        # Calculate basic relevance score
        relevance = matches / total_keywords if total_keywords > 0 else 0.0
        
        # Boost score for exact phrase matches
        task_phrases = ' '.join(keywords)
        if task_phrases.lower() in content_lower:
            relevance += 0.3
        
        return min(relevance, 1.0)


class WorkloadAnalyzer:
    """
    Utility class for analyzing user workload and task distribution
    """
    
    @staticmethod
    def get_current_workload(user: User) -> Dict[str, Any]:
        """
        Analyze current user workload
        
        Args:
            user: User object
            
        Returns:
            Dictionary with workload analysis
        """
        try:
            now = timezone.now()
            
            # Get pending and in-progress tasks
            active_tasks = Task.objects.filter(
                user=user,
                status__in=['pending', 'in_progress']
            )
            
            # Calculate workload metrics
            total_tasks = active_tasks.count()
            high_priority_tasks = active_tasks.filter(priority='high').count()
            urgent_tasks = active_tasks.filter(priority='urgent').count()
            overdue_tasks = active_tasks.filter(
                deadline__lt=now,
                status__in=['pending', 'in_progress']
            ).count()
            
            # Calculate total estimated time
            total_estimated_time = sum([
                task.estimated_duration or 60  # Default 60 minutes if not specified
                for task in active_tasks
            ])
            
            # Get tasks due in next 7 days
            week_ahead = now + timedelta(days=7)
            upcoming_tasks = active_tasks.filter(
                deadline__gte=now,
                deadline__lte=week_ahead
            ).count()
            
            # Calculate average priority score
            priority_scores = [task.ai_priority_score for task in active_tasks if task.ai_priority_score]
            avg_priority_score = sum(priority_scores) / len(priority_scores) if priority_scores else 5.0
            
            return {
                'total_active_tasks': total_tasks,
                'high_priority_tasks': high_priority_tasks,
                'urgent_tasks': urgent_tasks,
                'overdue_tasks': overdue_tasks,
                'upcoming_tasks_week': upcoming_tasks,
                'total_estimated_hours': total_estimated_time / 60,
                'average_priority_score': avg_priority_score,
                'workload_level': WorkloadAnalyzer._calculate_workload_level(
                    total_tasks, urgent_tasks, overdue_tasks, total_estimated_time
                )
            }
            
        except Exception as e:
            logger.error(f"Error analyzing workload: {str(e)}")
            return {
                'total_active_tasks': 0,
                'high_priority_tasks': 0,
                'urgent_tasks': 0,
                'overdue_tasks': 0,
                'upcoming_tasks_week': 0,
                'total_estimated_hours': 0,
                'average_priority_score': 5.0,
                'workload_level': 'low'
            }
    
    @staticmethod
    def _calculate_workload_level(total_tasks: int, urgent_tasks: int, 
                                overdue_tasks: int, total_time: int) -> str:
        """
        Calculate overall workload level
        
        Args:
            total_tasks: Total number of active tasks
            urgent_tasks: Number of urgent tasks
            overdue_tasks: Number of overdue tasks
            total_time: Total estimated time in minutes
            
        Returns:
            Workload level string
        """
        # Calculate workload score
        score = 0
        
        # Task count factor
        if total_tasks > 20:
            score += 3
        elif total_tasks > 10:
            score += 2
        elif total_tasks > 5:
            score += 1
        
        # Urgent tasks factor
        if urgent_tasks > 5:
            score += 3
        elif urgent_tasks > 2:
            score += 2
        elif urgent_tasks > 0:
            score += 1
        
        # Overdue tasks factor (heavily weighted)
        if overdue_tasks > 3:
            score += 4
        elif overdue_tasks > 1:
            score += 3
        elif overdue_tasks > 0:
            score += 2
        
        # Time factor (hours)
        hours = total_time / 60
        if hours > 40:
            score += 3
        elif hours > 20:
            score += 2
        elif hours > 10:
            score += 1
        
        # Determine level
        if score >= 8:
            return 'very_high'
        elif score >= 6:
            return 'high'
        elif score >= 3:
            return 'medium'
        else:
            return 'low'


class AIAnalysisLogger:
    """
    Utility class for logging AI analysis operations
    """
    
    @staticmethod
    def log_analysis(user: User, analysis_type: str, input_data: Dict[str, Any],
                    output_data: Optional[Dict[str, Any]] = None,
                    processing_time: Optional[float] = None,
                    error_message: Optional[str] = None,
                    success: bool = True) -> Optional[AIAnalysisLog]:
        """
        Log an AI analysis operation
        
        Args:
            user: User who requested the analysis
            analysis_type: Type of analysis performed
            input_data: Input data for the analysis
            output_data: Output data from the analysis
            processing_time: Time taken for processing in seconds
            error_message: Error message if analysis failed
            success: Whether the analysis was successful
            
        Returns:
            Created AIAnalysisLog object or None on error
        """
        try:
            log_entry = AIAnalysisLog.objects.create(
                user=user,
                analysis_type=analysis_type,
                input_data=input_data,
                output_data=output_data,
                processing_time=processing_time,
                error_message=error_message,
                success=success
            )
            return log_entry
        except Exception as e:
            logger.error(f"Error logging AI analysis: {str(e)}")
            return None
    
    @staticmethod
    def get_analysis_stats(user: User, days_back: int = 30) -> Dict[str, Any]:
        """
        Get AI analysis statistics for a user
        
        Args:
            user: User object
            days_back: Number of days to look back
            
        Returns:
            Dictionary with analysis statistics
        """
        try:
            date_threshold = timezone.now() - timedelta(days=days_back)
            
            logs = AIAnalysisLog.objects.filter(
                user=user,
                created_at__gte=date_threshold
            )
            
            total_analyses = logs.count()
            successful_analyses = logs.filter(success=True).count()
            failed_analyses = logs.filter(success=False).count()
            
            # Calculate average processing time
            successful_logs = logs.filter(success=True, processing_time__isnull=False)
            avg_processing_time = 0.0
            if successful_logs.exists():
                total_time = sum([log.processing_time for log in successful_logs])
                avg_processing_time = total_time / successful_logs.count()
            
            # Get analysis type breakdown
            analysis_types = {}
            for log in logs:
                analysis_type = log.analysis_type
                if analysis_type not in analysis_types:
                    analysis_types[analysis_type] = {'total': 0, 'successful': 0}
                analysis_types[analysis_type]['total'] += 1
                if log.success:
                    analysis_types[analysis_type]['successful'] += 1
            
            return {
                'total_analyses': total_analyses,
                'successful_analyses': successful_analyses,
                'failed_analyses': failed_analyses,
                'success_rate': successful_analyses / total_analyses if total_analyses > 0 else 0.0,
                'average_processing_time': avg_processing_time,
                'analysis_types': analysis_types
            }
            
        except Exception as e:
            logger.error(f"Error getting analysis stats: {str(e)}")
            return {
                'total_analyses': 0,
                'successful_analyses': 0,
                'failed_analyses': 0,
                'success_rate': 0.0,
                'average_processing_time': 0.0,
                'analysis_types': {}
            }


def run_async_ai_analysis(coro):
    """
    Helper function to run async AI analysis in Django views
    
    Args:
        coro: Coroutine to run
        
    Returns:
        Result of the coroutine
    """
    try:
        # Try to get existing event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is running, create a new thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            # If no loop is running, run directly
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No event loop exists, create one
        return asyncio.run(coro)


def measure_processing_time(func):
    """
    Decorator to measure processing time of AI operations
    
    Args:
        func: Function to measure
        
    Returns:
        Decorated function that returns (result, processing_time)
    """
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            processing_time = time.time() - start_time
            return result, processing_time
        except Exception as e:
            processing_time = time.time() - start_time
            raise e
    return wrapper


class CategoryTagManager:
    """
    Utility class for managing categories and tags
    """
    
    @staticmethod
    def get_or_create_category(name: str, color: str = '#3B82F6') -> Category:
        """
        Get existing category or create new one
        
        Args:
            name: Category name
            color: Category color (hex code)
            
        Returns:
            Category object
        """
        try:
            category, created = Category.objects.get_or_create(
                name=name,
                defaults={'color': color}
            )
            return category
        except Exception as e:
            logger.error(f"Error getting/creating category: {str(e)}")
            return None
    
    @staticmethod
    def get_or_create_tag(name: str, color: str = '#6B7280') -> Tag:
        """
        Get existing tag or create new one
        
        Args:
            name: Tag name
            color: Tag color (hex code)
            
        Returns:
            Tag object
        """
        try:
            tag, created = Tag.objects.get_or_create(
                name=name,
                defaults={'color': color}
            )
            if not created:
                tag.usage_count += 1
                tag.save()
            return tag
        except Exception as e:
            logger.error(f"Error getting/creating tag: {str(e)}")
            return None
    
    @staticmethod
    def get_popular_categories(limit: int = 10) -> List[str]:
        """
        Get list of popular category names
        
        Args:
            limit: Maximum number of categories to return
            
        Returns:
            List of category names
        """
        try:
            categories = Category.objects.order_by('-usage_frequency')[:limit]
            return [cat.name for cat in categories]
        except Exception as e:
            logger.error(f"Error getting popular categories: {str(e)}")
            return []
    
    @staticmethod
    def get_popular_tags(limit: int = 20) -> List[str]:
        """
        Get list of popular tag names
        
        Args:
            limit: Maximum number of tags to return
            
        Returns:
            List of tag names
        """
        try:
            tags = Tag.objects.order_by('-usage_count')[:limit]
            return [tag.name for tag in tags]
        except Exception as e:
            logger.error(f"Error getting popular tags: {str(e)}")
            return []

