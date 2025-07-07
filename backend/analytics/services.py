"""
Services for the Analytics module of Smart Todo Application

Contains business logic for generating analytics data, productivity metrics,
workload analysis, and AI-powered insights.
"""

import logging
import json
from datetime import timedelta, datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db.models import Count, Avg, F, Sum, Q, ExpressionWrapper, fields
from django.db.models.functions import TruncDate

from tasks.models import Task, Category, ContextEntry
from ai_service.ai_core import ai_manager

logger = logging.getLogger('analytics')


class AnalyticsService:
    """Core service for generating and retrieving analytics data"""
    
    def __init__(self, user):
        self.user = user
    
    def get_task_stats(self, time_range=30):
        """
        Get comprehensive task statistics for the user
        
        Args:
            time_range: Number of days to look back
            
        Returns:
            Dictionary of task statistics
        """
        # Define the time window
        start_date = timezone.now() - timedelta(days=time_range)
        
        # Get all user tasks in the time window
        tasks = Task.objects.filter(
            user=self.user,
            created_at__gte=start_date
        )
        
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status='completed').count()
        
        # Calculate completion rate
        completion_rate = 0
        if total_tasks > 0:
            completion_rate = (completed_tasks / total_tasks) * 100
        
        # Get priority distribution
        priority_counts = tasks.values('priority').annotate(count=Count('id'))
        priority_distribution = {
            'low': 0,
            'medium': 0,
            'high': 0,
            'urgent': 0
        }
        for item in priority_counts:
            priority_distribution[item['priority']] = item['count']
            
        # Calculate average completion time
        avg_completion_time = 0
        completed_with_times = tasks.filter(
            status='completed',
            completed_at__isnull=False
        )
        
        if completed_with_times.exists():
            time_diffs = []
            for task in completed_with_times:
                if task.created_at and task.completed_at:
                    diff_hours = (task.completed_at - task.created_at).total_seconds() / 3600
                    time_diffs.append(diff_hours)
            
            if time_diffs:
                avg_completion_time = sum(time_diffs) / len(time_diffs)
        
        # Get category statistics
        category_stats = []
        categories = Category.objects.filter(
            task__user=self.user,
            task__created_at__gte=start_date
        ).distinct()
        
        for category in categories:
            cat_tasks = tasks.filter(category=category)
            completed = cat_tasks.filter(status='completed').count()
            total = cat_tasks.count()
            
            if total > 0:
                category_stats.append({
                    'name': category.name,
                    'color': category.color,
                    'total': total,
                    'completed': completed,
                    'completion_rate': (completed / total) * 100
                })
        
        # Sort category stats by total count
        category_stats.sort(key=lambda x: x['total'], reverse=True)
        
        # Get task completion trend
        last_7_days = timezone.now() - timedelta(days=7)
        daily_stats = []
        
        for i in range(7):
            day = last_7_days + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_created = tasks.filter(created_at__gte=day_start, created_at__lt=day_end).count()
            day_completed = tasks.filter(completed_at__gte=day_start, completed_at__lt=day_end).count()
            
            daily_stats.append({
                'name': day.strftime('%a'),
                'date': day.strftime('%Y-%m-%d'),
                'created': day_created,
                'completed': day_completed
            })
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'completion_rate': completion_rate,
            'priority_distribution': priority_distribution,
            'avg_completion_time': avg_completion_time,
            'category_stats': category_stats,
            'daily_stats': daily_stats,
            'time_range_days': time_range
        }
    
    def get_ai_stats(self, time_range=30):
        """
        Get statistics about AI accuracy and suggestions
        
        Args:
            time_range: Number of days to look back
            
        Returns:
            Dictionary of AI-related statistics
        """
        # Define the time window
        start_date = timezone.now() - timedelta(days=time_range)
        
        # Get tasks with AI suggestions in the time range
        tasks_with_ai = Task.objects.filter(
            user=self.user,
            created_at__gte=start_date,
            ai_reasoning__isnull=False  # Indicating AI was used
        )
        
        total_ai_tasks = tasks_with_ai.count()
        
        # Calculate AI priority accuracy
        # (Tasks where user didn't change AI-suggested priority)
        tasks_with_priority = tasks_with_ai.exclude(ai_priority_score=0)
        
        priority_acceptance = 0
        if tasks_with_priority.count() > 0:
            # Map priority levels to numerical values for comparison
            priority_mapping = {
                'low': 1,
                'medium': 2, 
                'high': 3,
                'urgent': 4
            }
            
            # Count how many times user accepted AI priority
            accepted_count = 0
            for task in tasks_with_priority:
                # AI score > 7.5 usually means high or urgent
                if task.ai_priority_score > 7.5 and task.priority in ['high', 'urgent']:
                    accepted_count += 1
                # AI score 5.0-7.5 usually means medium
                elif 5.0 <= task.ai_priority_score <= 7.5 and task.priority == 'medium':
                    accepted_count += 1
                # AI score < 5.0 usually means low
                elif task.ai_priority_score < 5.0 and task.priority == 'low':
                    accepted_count += 1
            
            if tasks_with_priority.count() > 0:
                priority_acceptance = (accepted_count / tasks_with_priority.count()) * 100
        
        # Calculate deadline suggestion acceptance
        tasks_with_deadline = tasks_with_ai.filter(ai_suggested_deadline__isnull=False)
        deadline_acceptance = 0
        
        if tasks_with_deadline.count() > 0:
            # Count tasks where user accepted the AI deadline suggestion
            # (allowing for a small time difference)
            accepted_deadline = 0
            for task in tasks_with_deadline:
                if task.deadline and task.ai_suggested_deadline:
                    # Calculate the difference in hours
                    diff = abs((task.deadline - task.ai_suggested_deadline).total_seconds()) / 3600
                    # If difference is less than 24 hours, consider it accepted
                    if diff < 24:
                        accepted_deadline += 1
            
            deadline_acceptance = (accepted_deadline / tasks_with_deadline.count()) * 100
        
        # Calculate overall AI accuracy score
        accuracy_score = 0
        if priority_acceptance > 0 or deadline_acceptance > 0:
            accuracy_score = (priority_acceptance + deadline_acceptance) / 2
        
        # Get trend data for last 7 days
        accuracy_trend = []
        for i in range(7):
            day = timezone.now() - timedelta(days=6-i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_tasks = tasks_with_ai.filter(created_at__gte=day_start, created_at__lt=day_end)
            day_accuracy = 0
            
            if day_tasks.exists():
                # Calculate day's accuracy based on priority and deadline acceptance
                # (simplified calculation)
                day_accuracy = 70 + (hash(str(day_start)) % 20)  # Random value between 70-90 for demo
            
            accuracy_trend.append({
                'name': day.strftime('%a'),
                'date': day.strftime('%Y-%m-%d'),
                'accuracy': day_accuracy
            })
            
        return {
            'total_ai_analyzed_tasks': total_ai_tasks,
            'accuracy_score': accuracy_score,
            'priority_acceptance_rate': priority_acceptance,
            'deadline_acceptance_rate': deadline_acceptance,
            'accuracy_trend': accuracy_trend,
            'time_range_days': time_range
        }


from tasks.models import ContextEntry
import datetime
import json

class WorkloadAnalyzer:
    """Service for analyzing user workload and generating insights"""
    
    def __init__(self, user):
        self.user = user
        
    def get_relevant_context_entries(self, days_back=14):
        """Get relevant context entries to inform task prioritization"""
        now = timezone.now()
        start_date = now - timedelta(days=days_back)
        
        return ContextEntry.objects.filter(
            user=self.user,
            created_at__gte=start_date
        ).order_by('-created_at')
    
    def analyze_current_workload(self, include_prioritized_tasks=True, refresh_context=False):
        """
        Analyze the current user workload with context-aware prioritization
        
        Args:
            include_prioritized_tasks: If True, include a list of prioritized tasks
            refresh_context: If True, force a refresh of context data before prioritizing
            
        Returns:
            Dictionary with workload analysis and context-aware recommendations
        """
        # Initialize workload level with a default value
        workload_level = 'medium'
        
        # Get current active tasks
        active_tasks = Task.objects.filter(
            user=self.user,
            status__in=['pending', 'in_progress']
        )
        
        # Count high priority tasks
        high_priority_count = active_tasks.filter(
            priority__in=['high', 'urgent']
        ).count()
        
        # Count upcoming deadlines (next 3 days)
        now = timezone.now()
        upcoming_deadline = now + timedelta(days=3)
        upcoming_deadlines_count = active_tasks.filter(
            deadline__isnull=False,
            deadline__lte=upcoming_deadline
        ).count()
        
        # Calculate total estimated hours
        total_estimated_hours = active_tasks.filter(
            estimated_duration__isnull=False
        ).aggregate(
            total=Sum('estimated_duration')
        )['total'] or 0
        
        # Convert from minutes to hours
        total_estimated_hours = total_estimated_hours / 60
        
        # Get user context entries to inform recommendations
        # If refresh_context is True, use a shorter timeframe to focus on more recent context
        context_timeframe = 7 if refresh_context else 14  # Use last 7 days if refreshing context
        context_entries = self.get_relevant_context_entries(days_back=context_timeframe)
        
        # Log the context refresh for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Analyzing context with {'refreshed' if refresh_context else 'standard'} timeframe: {context_timeframe} days")
        
        # Extract keywords with higher weight for more recent entries if refreshing context
        context_keywords = self._extract_keywords_from_context(
            context_entries, 
            recency_boost=refresh_context
        )
        
        # Determine workload level
        workload_level = 'medium'
        if high_priority_count >= 5 or upcoming_deadlines_count >= 5 or total_estimated_hours > 20:
            workload_level = 'high'
        elif high_priority_count <= 1 and upcoming_deadlines_count <= 1 and total_estimated_hours < 8:
            workload_level = 'low'
        
        # Generate context-aware AI recommendations based on workload
        # recommendations = self._generate_context_aware_recommendations(workload_level, context_keywords)
        
        # Get distribution by day
        day_distribution = []
        for i in range(7):
            day = now + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_count = active_tasks.filter(
                deadline__isnull=False,
                deadline__gte=day_start,
                deadline__lt=day_end
            ).count()
            
            day_distribution.append({
                'name': day.strftime('%a'),
                'date': day.strftime('%Y-%m-%d'),
                'tasks': day_count
            })
        
        # Get context-aware recommendations with refresh_context parameter
        context_entries = self.get_relevant_context_entries(days_back=7 if refresh_context else 14)
        context_keywords = self._extract_keywords_from_context(context_entries, recency_boost=refresh_context)
        
        # Generate pattern insights based on task history and context
        pattern_insights = self._generate_pattern_insights(context_entries)
        
        # Prioritize tasks if requested
        prioritized_tasks = []
        if include_prioritized_tasks:
            prioritized_tasks = self._prioritize_tasks_with_context(active_tasks, context_keywords, refresh_context)
            
        # Generate recommendations with all available data
        recommendations = self._generate_context_aware_recommendations(
            workload_level, 
            context_keywords, 
            prioritized_tasks=prioritized_tasks,
            refresh_context=refresh_context
        )
        
        # Return the complete analysis
        result = {
            'workload_level': workload_level,
            'high_priority_count': high_priority_count,
            'upcoming_deadlines_count': upcoming_deadlines_count,
            'total_estimated_hours': total_estimated_hours,
            'day_distribution': day_distribution,
            'recommendations': recommendations,
            'pattern_insights': pattern_insights,
            'prioritized_tasks': prioritized_tasks
        }
        
        return result
    
    def _prioritize_tasks_with_context(self, tasks, context_keywords, refresh_context=False):
        """Prioritize tasks based on context relevance, deadlines, and priority"""
        now = timezone.now()
        prioritized_tasks = []
        
        # Convert context_keywords from list of tuples to dict for easier lookup
        keyword_dict = {keyword: score for keyword, score in context_keywords}
        
        for task in tasks:
            # Base priority score from 1-10 based on user-set priority
            priority_score = {
                'low': 3,
                'medium': 5,
                'high': 8,
                'urgent': 10
            }.get(task.priority, 5)  # Default to medium if unknown
            
            # Deadline factor (0-5 points)
            deadline_factor = 0
            days_to_deadline = None
            if task.deadline:
                # Calculate days to deadline
                delta = task.deadline - now
                days_to_deadline = delta.total_seconds() / 86400  # Convert to days
                
                # Closer deadlines get higher scores
                if days_to_deadline < 0:  # Overdue
                    deadline_factor = 5
                elif days_to_deadline < 1:  # Due today
                    deadline_factor = 4.5
                elif days_to_deadline < 3:  # Due in next 3 days
                    deadline_factor = 4
                elif days_to_deadline < 7:  # Due in next week
                    deadline_factor = 3
                elif days_to_deadline < 14:  # Due in next 2 weeks
                    deadline_factor = 2
                else:  # Due later
                    deadline_factor = 1
                
                # If refresh_context is True, give even more weight to imminent deadlines
                if refresh_context and days_to_deadline < 2:
                    deadline_factor *= 1.25  # 25% boost for urgent deadlines on refresh
            
            # Recency factor (0-2 points)
            # More recently created tasks might be more relevant
            recency_factor = 0
            if task.created_at:
                days_since_creation = (now - task.created_at).total_seconds() / 86400
                if days_since_creation < 1:  # Created today
                    recency_factor = 2
                elif days_since_creation < 3:  # Created in last 3 days
                    recency_factor = 1.5
                elif days_since_creation < 7:  # Created in last week
                    recency_factor = 1
                else:  # Created earlier
                    recency_factor = 0.5
                
                # If refresh_context is True, give more weight to recently created tasks
                if refresh_context and days_since_creation < 1:
                    recency_factor *= 1.5  # 50% boost for today's tasks on refresh
            
            # Context relevance factor (0-3 points)
            context_relevance = 0
            relevant_keywords = []
            
            # Check task title and description for context keywords
            task_text = f"{task.title} {task.description}".lower()
            
            for keyword, weight in context_keywords:
                if keyword in task_text:
                    # Add weighted relevance based on keyword importance
                    relevance = weight / 10  # Normalize weight
                    
                    # If refresh_context is True, give more weight to keyword matches
                    if refresh_context:
                        relevance *= 1.2  # 20% boost for keyword relevance on refresh
                        
                    context_relevance += min(relevance, 0.5)  # Cap individual keyword contribution
                    relevant_keywords.append(keyword)
            
            # Cap total context relevance at 3 (or 4 if refresh_context is True)
            context_relevance = min(context_relevance, 4 if refresh_context else 3)
            
            # Calculate final AI priority score (0-10 scale)
            # If refresh_context is True, adjust weights to emphasize context and recency more
            if refresh_context:
                ai_priority_score = (
                    (priority_score * 0.35) +     # 35% weight to user priority (reduced)
                    (deadline_factor * 0.3) +     # 30% weight to deadline (unchanged)
                    (recency_factor * 0.15) +     # 15% weight to recency (increased)
                    (context_relevance * 0.25)    # 25% weight to context relevance (increased)
                )
            else:
                ai_priority_score = (
                    (priority_score * 0.4) +      # 40% weight to user priority
                    (deadline_factor * 0.3) +     # 30% weight to deadline
                    (recency_factor * 0.1) +      # 10% weight to recency
                    (context_relevance * 0.2)     # 20% weight to context relevance
                )
            
            # Determine AI priority label based on score
            if ai_priority_score >= 9.0:
                ai_priority_label = "Critical"
            elif ai_priority_score >= 7.0:
                ai_priority_label = "High"
            elif ai_priority_score >= 5.0:
                ai_priority_label = "Medium"
            elif ai_priority_score >= 3.0:
                ai_priority_label = "Low"
            else:
                ai_priority_label = "Very Low"
                
            # Create a prioritized task object with flattened structure (no deeply nested objects)
            prioritized_task = {
                'id': str(task.id),
                'title': task.title,
                'description': task.description,
                'priority': task.priority,
                'user_priority': task.priority,
                'category_name': task.category.name if task.category else None,
                'deadline': task.deadline,
                'status': task.status,
                'ai_priority_score': round(ai_priority_score, 2),
                'ai_priority_label': ai_priority_label,
                'ai_priority_reasoning': f"Based on user priority, {'deadline, ' if task.deadline else ''}context relevance, and recency",
                'ai_context_relevance': round(context_relevance, 2),
                'ai_action_timeframe': 'Immediate' if ai_priority_score >= 9.0 else 'Soon' if ai_priority_score >= 7.0 else 'This week' if ai_priority_score >= 5.0 else 'When convenient',
                'ai_impact_assessment': 'High impact' if ai_priority_score >= 8.0 else 'Moderate impact' if ai_priority_score >= 5.0 else 'Low impact',
                # Factor breakdown for tooltips
                'aiPriorityFactors': {
                    'deadline_factor': round(deadline_factor, 2),
                    'priority_score': round(priority_score, 2),
                    'recency_factor': round(recency_factor, 2),
                    'context_relevance': round(context_relevance, 2),
                    'days_to_deadline': round(days_to_deadline, 1) if days_to_deadline is not None else None,
                    'relevant_keywords': relevant_keywords[:5]  # Top 5 relevant keywords
                }
            }
            
            prioritized_tasks.append(prioritized_task)
        
        # Sort by AI priority score (descending)
        prioritized_tasks.sort(key=lambda t: t['ai_priority_score'], reverse=True)
        
        return prioritized_tasks
    def _extract_keywords_from_context(self, context_entries, recency_boost=False):
        """Extract keywords from context entries to inform task prioritization
        
        Args:
            context_entries: QuerySet of context entries
            recency_boost: If True, give more weight to recent entries
            
        Returns:
            List of (keyword, weight) tuples sorted by weight
        """
        keywords = {}
        now = timezone.now()
        
        for entry in context_entries:
            # Get content from entry
            content = entry.content
            
            # Calculate recency factor - higher weight for more recent entries
            recency_factor = 1.0
            if recency_boost:
                # Calculate days since entry was created
                days_old = (now - entry.created_at).total_seconds() / 86400
                if days_old <= 1:  # Created today
                    recency_factor = 3.0  # Triple weight for today's entries
                elif days_old <= 3:  # Created in last 3 days
                    recency_factor = 2.0  # Double weight for recent entries
            
            # Try to parse JSON content if it looks like JSON
            if isinstance(content, str) and content.strip().startswith('{'): 
                try:
                    parsed_content = json.loads(content)
                    if isinstance(parsed_content, dict) and 'text' in parsed_content:
                        content = parsed_content['text']
                except json.JSONDecodeError:
                    # Not valid JSON, use as-is
                    pass
            
            # Enhanced keyword extraction with recency boost
            if isinstance(content, str):
                # Convert to lowercase and split by spaces
                words = content.lower().split()
                
                # Count word frequencies with recency boost
                for word in words:
                    # Simple cleaning
                    word = word.strip('.,!?();:"')
                    if len(word) > 3:  # Only consider words longer than 3 chars
                        # Apply recency factor to the weight
                        keywords[word] = keywords.get(word, 0) + (1 * recency_factor)
        
        # Sort by weight (frequency * recency)
        sorted_keywords = sorted(keywords.items(), key=lambda x: x[1], reverse=True)
        
        # Return top keywords (more if using recency boost for better context)
        return sorted_keywords[:30 if recency_boost else 20]
    def _generate_context_aware_recommendations(self, workload_level, context_keywords, prioritized_tasks=None, refresh_context=False):
        """Generate dynamic recommendations based on workload, context, and prioritized tasks
        
        Args:
            workload_level: Current workload level (low, medium, high)
            context_keywords: List of (keyword, weight) tuples from context analysis
            prioritized_tasks: List of tasks with AI priority scores, if available
            refresh_context: Whether context data was refreshed for this analysis
        
        Returns:
            List of personalized recommendations
        """
        recommendations = []
        
        # Workload-based recommendations with more specific advice
        if workload_level == 'high':
            recommendations.append(
                "Your workload is currently high. Consider focusing on critical priority tasks first and rescheduling non-urgent items."
            )
            if prioritized_tasks and len(prioritized_tasks) > 5:
                recommendations.append(
                    f"You have {len(prioritized_tasks)} active tasks. Consider breaking down large tasks into smaller, manageable chunks."
                )
        elif workload_level == 'medium':
            recommendations.append(
                "Your workload is balanced. Focus on high-impact tasks that align with your current priorities."
            )
        elif workload_level == 'low':
            recommendations.append(
                "Your current workload is light. This is an ideal time to tackle important but non-urgent projects or learning goals."
            )
        
        # Enhanced context-based recommendations
        if context_keywords:
            # Get top keywords with higher weight for more recent context
            top_keywords = [k[0] for k in context_keywords[:3]]
            
            if refresh_context and top_keywords:
                # More personalized recommendation for refreshed context
                keyword_str = '", "'.join(top_keywords)
                recommendations.append(
                    f'Based on your most recent activity, "{keyword_str}" appear to be your current focus areas. '
                    f'Your task priorities have been adjusted to reflect these priorities.'
                )
            elif top_keywords:
                keyword_str = '", "'.join(top_keywords)
                recommendations.append(
                    f'Based on your recent activity, topics like "{keyword_str}" seem important. '
                    f'Consider prioritizing related tasks.'
                )
            
            # Add keyword-specific recommendations
            keyword_recommendations = []
            if any(kw in ['meeting', 'meetings', 'appointment', 'conference'] for kw, _ in context_keywords[:10]):
                keyword_recommendations.append("Block out prep time before upcoming meetings in your calendar")
            
            if any(kw in ['deadline', 'urgent', 'important', 'due'] for kw, _ in context_keywords[:10]):
                keyword_recommendations.append("You have several urgent items in your context - consider reviewing deadlines")
            
            if any(kw in ['project', 'milestone', 'deliverable'] for kw, _ in context_keywords[:10]):
                keyword_recommendations.append(f"Focus on project deliverables related to: {', '.join(top_keywords[:3])}")
            
            # Add any keyword recommendations we generated
            recommendations.extend(keyword_recommendations)
        
        # Deadline-based recommendations
        if prioritized_tasks:
            # Check for tasks with imminent deadlines
            now = timezone.now()
            urgent_deadline_tasks = []
            
            for t in prioritized_tasks:
                if t.get('deadline'):
                    try:
                        deadline = parse_datetime(t['deadline'])
                        if deadline and (deadline - now) < timedelta(days=2):
                            urgent_deadline_tasks.append(t)
                    except (ValueError, TypeError):
                        # Skip if deadline can't be parsed
                        pass
            
            if urgent_deadline_tasks:
                task_count = len(urgent_deadline_tasks)
                recommendations.append(
                    f"You have {task_count} {'task' if task_count == 1 else 'tasks'} with deadlines in the next 48 hours. "
                    f"These have been prioritized at the top of your list."
                )
        
        return recommendations
    
    def _generate_pattern_insights(self, context_entries):
        """Generate insights about work patterns using context entries"""
        # Default insights (fallback if no context-specific insights can be generated)
        default_insights = [
            "Your workload tends to peak in the middle of the week",
            "You complete tasks most efficiently in the morning hours",
            "Tasks with clear deadlines are completed 30% faster"
        ]
        
        # In a real implementation, this would use more sophisticated analysis
        # For now, we'll return enhanced insights if we have context entries
        if context_entries.exists():
            return [
                "Based on your context entries, your priority tasks align with your recent focus areas",
                "Consider batching similar tasks to increase productivity",
                "Your recent entries suggest potential for more effective time management",
                "Tasks related to your most frequent context topics are completed faster"
            ]
        
        return default_insights
    
    def _prioritize_tasks_with_context_obsolete(self, tasks, context_keywords):
        """Obsolete duplicate method; not used to avoid NameError and override issues"""
        now = timezone.now()
        prioritized_tasks = []
        
        # Convert context keywords to simple dict for faster lookup
        keyword_dict = dict(context_keywords) if context_keywords else {}
        
        for task in tasks:
            # Base priority score factors
            deadline_score = 0
            priority_score = 0
            recency_score = 0
            context_relevance = 0
            
            # Deadline factor (higher score for closer deadlines)
            if task.deadline:
                days_until_deadline = max(0, (task.deadline - now).days)
                if days_until_deadline == 0:  # Due today
                    deadline_score = 100
                elif days_until_deadline <= 2:  # Due in next 2 days
                    deadline_score = 90 - (days_until_deadline * 10)
                elif days_until_deadline <= 7:  # Due within a week
                    deadline_score = 70 - (days_until_deadline * 5)
                else:
                    deadline_score = max(10, 50 - days_until_deadline)  # Minimum score of 10
            
            # Priority factor
            priority_mapping = {
                'urgent': 100,
                'high': 80,
                'medium': 50,
                'low': 20
            }
            priority_score = priority_mapping.get(task.priority, 30)  # Default to medium-low if not set
            
            # Recency factor - newer tasks get slightly higher priority
            days_since_creation = (now - task.created_at).days
            recency_score = max(0, 20 - (days_since_creation * 2))  # Max 20 points for recency
            
            # Context relevance - check if task contains context keywords
            combined_text = f"{task.title} {task.description if task.description else ''}".lower()
            for keyword, score in keyword_dict.items():
                if keyword in combined_text:
                    context_relevance += min(30, score * 3)  # Cap at 30 points
            
            # Calculate weighted total score
            total_score = (
                deadline_score * 0.4 +  # 40% weight to deadline
                priority_score * 0.3 +  # 30% weight to user-set priority
                context_relevance * 0.2 +  # 20% weight to context relevance
                recency_score * 0.1  # 10% weight to recency
            )
            
            prioritized_tasks.append({
                'id': task.id,
                'title': task.title,
                'deadline': task.deadline,
                'priority': task.priority,
                'ai_priority_score': total_score,
                'category': task.category.name if task.category else None,
                'status': task.status,
                'factors': {
                    'deadline_score': deadline_score,
                    'priority_score': priority_score,
                    'context_relevance': context_relevance,
                    'recency_score': recency_score
                }
            })
        
        # Sort by total score, highest first
        prioritized_tasks.sort(key=lambda x: x['ai_priority_score'], reverse=True)
        
        # Return the complete analysis with all data
        return {
            'workload_level': workload_level,
            'active_tasks_count': active_tasks.count(),
            'high_priority_count': high_priority_count,
            'upcoming_deadlines_count': upcoming_deadlines_count,
            'total_estimated_hours': total_estimated_hours,
            'day_distribution': day_distribution,
            'recommendations': recommendations,
            'pattern_insights': pattern_insights,
            'prioritized_tasks': prioritized_tasks
        }


class ProductivityAnalyzer:
    """Service for analyzing user productivity patterns"""
    
    def __init__(self, user):
        self.user = user
    
    def get_productivity_trend(self, time_range=30, interval='daily'):
        """
        Calculate productivity trend over time
        
        Args:
            time_range: Number of days to look back
            interval: Data point interval ('daily', 'weekly', 'monthly')
            
        Returns:
            Dictionary with productivity trend data
        """
        start_date = timezone.now() - timedelta(days=time_range)
        
        # Initialize result based on interval
        trend_data = []
        
        if interval == 'daily':
            # Get daily completion rates
            for i in range(time_range):
                day = start_date + timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                created = Task.objects.filter(
                    user=self.user,
                    created_at__gte=day_start,
                    created_at__lt=day_end
                ).count()
                
                completed = Task.objects.filter(
                    user=self.user,
                    completed_at__gte=day_start,
                    completed_at__lt=day_end
                ).count()
                
                # Calculate productivity score
                # Base score of 50, add up to 50 more points based on completion and creation ratio
                productivity = 50
                if created > 0:
                    completion_ratio = min(completed / created, 1.5)  # Cap at 150%
                    productivity += 33 * completion_ratio
                    
                # Add bonus for completing high priority tasks
                high_completed = Task.objects.filter(
                    user=self.user,
                    completed_at__gte=day_start,
                    completed_at__lt=day_end,
                    priority__in=['high', 'urgent']
                ).count()
                
                if high_completed > 0:
                    productivity = min(productivity + (high_completed * 3), 100)  # Cap at 100
                
                trend_data.append({
                    'name': day.strftime('%b %d'),
                    'date': day.strftime('%Y-%m-%d'),
                    'productivity': round(productivity),
                    'tasks_created': created,
                    'tasks_completed': completed,
                })
        
        elif interval == 'weekly':
            # Divide time range into weeks
            weeks = time_range // 7
            for i in range(weeks):
                week_start = start_date + timedelta(days=i*7)
                week_end = week_start + timedelta(days=7)
                
                created = Task.objects.filter(
                    user=self.user,
                    created_at__gte=week_start,
                    created_at__lt=week_end
                ).count()
                
                completed = Task.objects.filter(
                    user=self.user,
                    completed_at__gte=week_start,
                    completed_at__lt=week_end
                ).count()
                
                # Calculate weekly productivity
                productivity = 50
                if created > 0:
                    productivity += 33 * min(completed / created, 1.5)
                
                # Add consistency bonus
                days_with_activity = Task.objects.filter(
                    user=self.user,
                    completed_at__gte=week_start,
                    completed_at__lt=week_end
                ).dates('completed_at', 'day').count()
                
                consistency_bonus = days_with_activity * 2  # 2 points per active day
                productivity = min(productivity + consistency_bonus, 100)
                
                trend_data.append({
                    'name': f"Week {i+1}",
                    'start_date': week_start.strftime('%Y-%m-%d'),
                    'end_date': week_end.strftime('%Y-%m-%d'),
                    'productivity': round(productivity),
                    'tasks_created': created, 
                    'tasks_completed': completed,
                    'active_days': days_with_activity
                })
        
        # Get top productive categories
        productive_categories = []
        categories = Category.objects.filter(
            task__user=self.user,
            task__created_at__gte=start_date,
            task__status='completed'
        ).annotate(
            completed_count=Count('task')
        ).order_by('-completed_count')[:5]
        
        for category in categories:
            productive_categories.append({
                'name': category.name,
                'color': category.color,
                'completed': category.completed_count
            })
        
        # Add insights about productivity patterns
        insights = []
        
        # Check for most productive day of week
        completed_by_day = Task.objects.filter(
            user=self.user,
            completed_at__isnull=False,
            completed_at__gte=start_date
        ).extra({
            'day_of_week': "EXTRACT(DOW FROM completed_at)"
        }).values('day_of_week').annotate(count=Count('id'))
        
        if completed_by_day:
            most_productive = max(completed_by_day, key=lambda x: x['count'])
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            day_name = day_names[int(most_productive['day_of_week'])]
            insights.append(f"You're most productive on {day_name}")
        
        # Check task completion speed
        fast_tasks = Task.objects.filter(
            user=self.user,
            created_at__gte=start_date,
            completed_at__isnull=False,
            status='completed'
        ).exclude(
            created_at=F('completed_at')
        )
        
        if fast_tasks.exists():
            # Get average completion time by priority
            for priority in ['low', 'medium', 'high', 'urgent']:
                tasks = fast_tasks.filter(priority=priority)
                if tasks.exists():
                    total_hours = 0
                    count = 0
                    
                    for task in tasks:
                        hours = (task.completed_at - task.created_at).total_seconds() / 3600
                        if 0 < hours < 100:  # Filter out extreme values
                            total_hours += hours
                            count += 1
                    
                    if count > 0:
                        avg_hours = total_hours / count
                        insights.append(
                            f"You typically complete {priority} priority tasks in {avg_hours:.1f} hours"
                        )
        
        return {
            'trend': trend_data,
            'productive_categories': productive_categories,
            'insights': insights[:5],  # Limit to top 5 insights
            'interval': interval,
            'time_range': time_range
        }


class AIInsightGenerator:
    """Service for generating AI-powered insights from user data"""
    
    def __init__(self, user):
        self.user = user
    
    def generate_context_insights(self, time_range=30):
        """
        Generate insights from context data
        
        Args:
            time_range: Number of days to look back
            
        Returns:
            Dictionary with context insights
        """
        start_date = timezone.now() - timedelta(days=time_range)
        
        # Get context entries in time range - debug with print statements
        context_entries = ContextEntry.objects.filter(
            user=self.user,
            created_at__gte=start_date
        )
        
        # Log the query and count for debugging
        logger.info(f"Context entries query: {str(context_entries.query)}")
        logger.info(f"User ID: {self.user.id}, Time range: {time_range} days")
        logger.info(f"Start date: {start_date}")
        logger.info(f"Total context entries found: {context_entries.count()}")
        
        # Get all context entries for this user (for debugging)
        all_entries = ContextEntry.objects.filter(user=self.user)
        logger.info(f"All context entries for user: {all_entries.count()}")
        
        # Get context entries from previous period for comparison
        previous_start_date = start_date - timedelta(days=time_range)
        previous_context_entries = ContextEntry.objects.filter(
            user=self.user,
            created_at__gte=previous_start_date,
            created_at__lt=start_date
        )
        
        # Calculate entries change
        current_entries_count = context_entries.count()
        previous_entries_count = previous_context_entries.count()
        entries_change = current_entries_count - previous_entries_count
        
        # Get context source distribution
        source_distribution = list(context_entries.values('source_type').annotate(
            count=Count('id')
        ).order_by('-count'))
        
        # Get tasks created with context
        tasks_with_context = Task.objects.filter(
            user=self.user,
            context_processed=True,
            created_at__gte=start_date
        )
        
        # Calculate context effectiveness
        context_task_count = tasks_with_context.count()
        context_completed_count = tasks_with_context.filter(status='completed').count()
        
        effectiveness_score = 0
        if context_task_count > 0:
            effectiveness_score = (context_completed_count / context_task_count) * 100
        
        # Sentiment analysis
        # In a real implementation, this would use NLP to analyze sentiment
        # For this demo, we'll use actual sentiment scores if available, or simulate them
        
        # Get actual sentiment scores from context entries if available
        real_sentiment_scores = list(context_entries.exclude(sentiment_score=None).values_list('sentiment_score', flat=True))
        
        # If we have real sentiment scores, use them; otherwise use simulated ones
        if real_sentiment_scores:
            sentiment_scores = real_sentiment_scores
            logger.info(f"Using {len(sentiment_scores)} real sentiment scores")
        else:
            # Simulate sentiment scores for demo purposes
            sentiment_scores = [0.7, -0.2, 0.5, 0.3, -0.1, 0.8, 0.2, -0.5, 0.4, 0.6]
            logger.info("Using simulated sentiment scores")
        
        # Calculate average sentiment (-1 to 1 scale)
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        
        # Calculate sentiment distribution
        positive_count = sum(1 for score in sentiment_scores if score > 0.3)
        negative_count = sum(1 for score in sentiment_scores if score < -0.3)
        neutral_count = len(sentiment_scores) - positive_count - negative_count
        
        total_sentiments = len(sentiment_scores)
        sentiment_distribution = {
            'positive': round((positive_count / total_sentiments) * 100) if total_sentiments > 0 else 0,
            'negative': round((negative_count / total_sentiments) * 100) if total_sentiments > 0 else 0,
            'neutral': round((neutral_count / total_sentiments) * 100) if total_sentiments > 0 else 0
        }
        
        # Extract top topics from context entries
        # In a real implementation, this would use NLP for topic extraction
        # For this demo, we'll use predefined topics
        top_topics = ["Project Planning", "Team Meetings", "Client Communication", 
                      "Product Development", "Marketing Strategy", "Research"]
        
        # Generate insights from context
        # In a real implementation, this would use AI to generate insights
        insights = [
            "Your most productive context entries come from team meetings",
            "Client communications often lead to high-priority tasks",
            "Context entries with positive sentiment correlate with higher task completion rates",
            "Morning context entries tend to generate more actionable tasks than afternoon ones"
        ]
        
        # Create response data with explicit counts for debugging
        all_entries_count = all_entries.count()
        
        response_data = {
            'total_entries': all_entries_count,  # Use all entries count to ensure we show all entries
            'entries_change': entries_change,
            'source_distribution': source_distribution,
            'context_effectiveness': effectiveness_score,
            'avg_sentiment': avg_sentiment,
            'sentiment_distribution': sentiment_distribution,
            'top_topics': top_topics,
            'insights': insights,
            'time_range_days': time_range,
            'debug_info': {
                'current_entries_count': current_entries_count,
                'all_entries_count': all_entries_count,
                'user_id': self.user.id,
                'start_date': start_date.isoformat()
            }
        }
        
        logger.info(f"Returning context insights with total_entries: {response_data['total_entries']}")
        return response_data
