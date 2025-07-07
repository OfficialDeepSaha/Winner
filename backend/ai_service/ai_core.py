"""
Core AI Service Module for Smart Todo List Application

This module provides AI-powered features including:
- Context processing and analysis
- Task prioritization based on context
- Deadline suggestions
- Smart categorization and tagging
- Task enhancement with context-aware details
"""

import os
import json
import logging
import asyncio
import functools
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import google.generativeai as genai
from django.conf import settings
from django.utils import timezone
import re


# Configure logging
logger = logging.getLogger('ai_service')

# Configure Gemini AI
genai.configure(api_key=settings.GEMINI_API_KEY)


@dataclass
class TaskPriority:
    """Data class for task priority analysis results"""
    score: float  # 0-10 scale
    reasoning: str
    urgency_factors: List[str]
    context_relevance: float
    priority_label: str = ""  # Critical, High, Medium, Low, Very Low
    action_timeframe: str = ""  # e.g., "Today", "This week", etc.
    impact_assessment: str = ""  # Brief assessment of importance


@dataclass
class DeadlineSuggestion:
    """Data class for deadline suggestion results"""
    suggested_deadline: datetime
    confidence: float  # 0-1 scale
    reasoning: str
    factors_considered: List[str]


@dataclass
class CategorySuggestion:
    """Data class for category suggestion results"""
    suggested_categories: List[str]
    suggested_tags: List[str]
    confidence: float
    reasoning: str


@dataclass
class ContextInsights:
    """Data class for context analysis results"""
    summary: str
    key_topics: List[str]
    urgency_indicators: List[str]
    potential_tasks: List[Dict[str, Any]]
    sentiment_score: float  # -1 to 1 scale
    time_references: List[str]


@dataclass
class SchedulingSuggestion:
    """Data class for task scheduling suggestion results"""
    suggested_start_time: datetime
    suggested_end_time: datetime
    confidence: float  # 0-1 scale
    reasoning: str
    factors_considered: List[str]
    alternative_slots: List[Dict[str, Any]]  # List of alternative time slots


class GeminiAIService:
    """
    Main AI service class that handles all AI-powered features
    using Google's Gemini API
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
        
    async def analyze_context(self, context_content: str, source_type: str) -> ContextInsights:
        """
        Analyze daily context (messages, emails, notes) to extract insights
        
        Args:
            context_content: The text content to analyze
            source_type: Type of source (whatsapp, email, notes, etc.)
            
        Returns:
            ContextInsights object with analysis results
        """
        try:
            prompt = f"""
            Analyze the following {source_type} content and extract key insights for task management:

            Content: {context_content}

            Please provide a comprehensive analysis in JSON format with the following structure:
            {{
                "summary": "Brief summary of the content",
                "key_topics": ["topic1", "topic2", "topic3"],
                "urgency_indicators": ["urgent phrase 1", "urgent phrase 2"],
                "potential_tasks": [
                    {{
                        "title": "Task title",
                        "description": "Task description",
                        "urgency": "high/medium/low",
                        "deadline_hint": "any time reference found"
                    }}
                ],
                "sentiment_score": 0.5,
                "time_references": ["tomorrow", "next week", "by Friday"]
            }}

            Focus on:
            1. Identifying actionable items or tasks mentioned
            2. Detecting urgency indicators (deadlines, time pressure)
            3. Understanding the overall sentiment and stress level
            4. Extracting time-related information
            5. Identifying key topics and themes
            """

            response = await self._generate_content_async(prompt)
            
            # Parse JSON response
            try:
                # Try direct parsing first
                result_data = json.loads(response.text)
            except json.JSONDecodeError:
                # Log the failed response for debugging
                logger.warning(f"JSON parsing failed in analyze_context. Response text: {response.text[:500]}...")
                
                # Try fallback parsing methods
                result_data = self._extract_json_from_text(response.text)
                
                # Log the extraction results
                logger.info(f"Extracted JSON result: {json.dumps(result_data, default=str)[:200]}...")
                
                # Ensure all required fields exist
                if not result_data.get('summary'):
                    logger.warning("No summary found in extracted JSON, using fallback")
                    result_data['summary'] = "Analysis extracted key information from content."
                    
                # Set default values for any missing fields
                for field in ['key_topics', 'urgency_indicators', 'potential_tasks', 'time_references']:
                    if field not in result_data:
                        result_data[field] = []
                        
                if 'sentiment_score' not in result_data:
                    result_data['sentiment_score'] = 0.0
            
            return ContextInsights(
                summary=result_data.get('summary', ''),
                key_topics=result_data.get('key_topics', []),
                urgency_indicators=result_data.get('urgency_indicators', []),
                potential_tasks=result_data.get('potential_tasks', []),
                sentiment_score=float(result_data.get('sentiment_score', 0.0)),
                time_references=result_data.get('time_references', [])
            )
            
        except Exception as e:
            logger.error(f"Error analyzing context: {str(e)}")
            # Return default insights on error
            return ContextInsights(
                summary="Error analyzing content",
                key_topics=[],
                urgency_indicators=[],
                potential_tasks=[],
                sentiment_score=0.0,
                time_references=[]
            )

    async def prioritize_task(self, task_data: Dict[str, Any], context_data: List[Dict[str, Any]], 
                            user_preferences: Optional[Dict[str, Any]] = None) -> TaskPriority:
        """
        Analyze and prioritize a task based on context and user preferences
        
        Args:
            task_data: Dictionary containing task information
            context_data: List of relevant context entries
            user_preferences: Optional user preferences for prioritization
            
        Returns:
            TaskPriority object with priority analysis
        """
        try:
            # Prepare context summary
            context_summary = self._prepare_context_summary(context_data)
            
            # Check for urgent context
            urgent_contexts = [ctx for ctx in context_data if self._has_urgency_indicators(ctx)]
            has_urgent_context = len(urgent_contexts) > 0
            
            # Get current date and extract dates from context
            current_date = timezone.now()
            context_dates = self._extract_dates_from_context(context_data, current_date)
            earliest_context_date = min(context_dates) if context_dates else None
            
            # Calculate date proximity for urgency assessment
            date_urgency = "none"
            if earliest_context_date:
                days_difference = (earliest_context_date - current_date).total_seconds() / 86400
                if days_difference < 1:  # Less than 1 day
                    date_urgency = "critical"
                elif days_difference < 2:  # Less than 2 days
                    date_urgency = "high"
                elif days_difference < 7:  # Less than a week
                    date_urgency = "medium"
            
            # Perform complexity analysis on the task title and description
            complexity_indicators = [
                "complex", "challenging", "difficult", "intricate", "sophisticated",
                "advanced", "complicated", "elaborate", "high-level", "comprehensive",
                "extensive", "involved", "detailed", "critical", "crucial",
                "essential", "vital", "significant", "major", "important",
                "key", "central", "fundamental", "pivotal", "primary",
                "strategic", "technical", "review", "analysis", "design",
                "implementation", "migration", "integration", "deployment", "optimization",
                "reconfiguration", "restructuring", "revamp", "overhaul", "refactor",
                "system", "framework", "architecture", "infrastructure", "platform",
                "meeting", "presentation", "urgent", "immediate", "stakeholder"
            ]
            
            # Simplicity indicators - words that suggest a task is simpler
            simplicity_indicators = [
                "simple", "basic", "easy", "straightforward", "quick", 
                "small", "minor", "trivial", "beginner", "starter",
                "practice", "exercise", "tutorial", "learning", "demo",
                "example", "sample", "test", "prototype", "hobby",
                "game", "html", "css", "frontend", "ui", "simple app",
                "tic-tac-toe", "tic tac toe", "tictactoe", "toy project", "practice project"
            ]
            
            # Strong simplicity phrases that should almost always result in Low priority
            strong_simplicity_phrases = [
                "simple game", "basic game", "simple html", "basic html", 
                "simple app", "basic app", "learning project", "practice project",
                "simple tic-tac-toe", "basic tic-tac-toe", "simple tictactoe", 
                "html game", "css game", "beginner project", "starter project"
            ]
            
            task_text = f"{task_data.get('title', '')} {task_data.get('description', '')}".lower()
            complexity_count = sum(1 for indicator in complexity_indicators if indicator in task_text)
            simplicity_count = sum(1 for indicator in simplicity_indicators if indicator in task_text)
            
            # Check for strong simplicity phrases that should force low priority
            has_strong_simplicity = any(phrase in task_text for phrase in strong_simplicity_phrases)
            
            # Adjust complexity score based on simplicity indicators
            # More simplicity indicators should reduce the complexity score
            complexity_score = min(10, complexity_count * 0.8 - simplicity_count * 1.5)
            
            # If strong simplicity phrases are found, force a very low complexity score
            if has_strong_simplicity:
                complexity_score = min(1.5, complexity_score)  # Cap at 1.5 for strong simplicity indicators
                logger.info(f"Strong simplicity phrase detected in task: '{task_data.get('title', '')}'. Forcing low complexity score.")
                
            complexity_score = max(0, complexity_score)  # Ensure it doesn't go below 0
            
            prompt = f"""
            Analyze the following task and provide a priority score based on the given context and complexity:

            Task Information:
            - Title: {task_data.get('title', '')}
            - Description: {task_data.get('description', '')}
            - Category: {task_data.get('category', 'None')}
            - User Priority: {task_data.get('priority', 'None')}
            - Deadline: {task_data.get('deadline', 'None')}
            - Estimated Duration: {task_data.get('estimated_duration', 'Unknown')} minutes
            - Complexity Score (auto-detected): {complexity_score}/10

            Current Context:
            {context_summary}
            
            {'URGENT CONTEXT DETECTED: There are urgent items in the context that may require immediate attention and may affect this task priority.' if has_urgent_context else ''}
            {'IMPORTANT DATE DETECTED: ' + earliest_context_date.strftime('%Y-%m-%d') + ' is an important date in the context that requires ' + date_urgency.upper() + ' priority attention.' if earliest_context_date else ''}

            User Preferences:
            {json.dumps(user_preferences or {}, indent=2)}

            Please analyze and provide a JSON response with:
            {{
                "priority_score": 7.5,
                "priority_label": "High",
                "reasoning": "Detailed explanation of the priority score",
                "urgency_factors": ["factor1", "factor2", "factor3"],
                "context_relevance": 0.8,
                "action_timeframe": "Recommended action timeframe (e.g., 'Today', 'This week', etc.)",
                "impact_assessment": "Brief assessment of task's impact and importance"
            }}

            Priority scoring guidelines:
            - 9-10: Critical/Urgent (immediate action required)
            - 7-8: High priority (should be done soon)
            - 5-6: Medium priority (normal importance)
            - 3-4: Low priority (can be delayed)
            - 1-2: Very low priority (optional/nice to have)

            Provide an appropriate priority_label that matches the score ("Critical", "High", "Medium", "Low", or "Very Low").

            Consider these factors in order of importance:
            1. Deadline proximity and importance
            2. Context relevance and urgency indicators
            3. Task complexity and estimated duration
            4. Dependencies on other tasks or people
            5. User preferences and work patterns
            6. Potential impact if delayed
            
            IMPORTANT GUIDELINES:
            - Simple tasks (like basic HTML/CSS projects, tutorials, practice exercises, games, demos) MUST be assigned LOW priority unless there are specific urgent deadlines or critical dependencies.
            - SPECIFICALLY, any task involving a simple game like tic-tac-toe, especially in HTML/CSS/JavaScript, should ALWAYS be LOW priority.
            - Tasks with educational or learning purposes should ALWAYS be LOW priority unless they are prerequisites for higher priority work.
            - Tasks with high complexity (score > 6) should generally receive High or Critical priority.
            - Tasks with low complexity (score < 2) MUST receive Low priority.
            - Always consider the actual scope and impact of the task rather than just the presence of certain keywords.
            
            EXPLICIT EXAMPLES OF LOW PRIORITY TASKS:
            - Creating a tic-tac-toe game in HTML/CSS/JavaScript
            - Building a simple calculator app
            - Making a basic portfolio website
            - Learning exercises and tutorials
            - Small hobby projects            
            """

            response = await self._generate_content_async(prompt)
            
            try:
                result_data = json.loads(response.text)
            except json.JSONDecodeError:
                result_data = self._extract_json_from_text(response.text)
            
            # Check if this is a simple task that should be forced to low priority
            task_text = f"{task_data.get('title', '')} {task_data.get('description', '')}".lower()
            
            # Force low priority for specific simple tasks regardless of AI response
            force_low_priority = False
            
            # Check for specific simple task patterns
            simple_task_patterns = [
                "tic-tac-toe", "tic tac toe", "tictactoe",
                "simple html", "basic html", "html game",
                "learning project", "practice project", "simple game",
                "tutorial project", "beginner project"
            ]
            
            if any(pattern in task_text for pattern in simple_task_patterns):
                force_low_priority = True
                logger.info(f"Forcing LOW priority for simple task: '{task_data.get('title', '')}' based on pattern match")
            
            # Set default priority label based on score if not provided
            score = float(result_data.get('priority_score', 5.0))
            
            # Override score for simple tasks
            if force_low_priority:
                score = 2.5  # Force a low priority score
                result_data['priority_score'] = score
                result_data['priority_label'] = "Low"  # Explicitly set to Low
                result_data['reasoning'] = f"This is a simple task that should be low priority. {result_data.get('reasoning', '')}"
                logger.info(f"Explicitly setting priority_label to 'Low' for simple task: '{task_data.get('title', '')}'")  
            
            # Only calculate priority label if not already set or if we need to force it
            elif 'priority_label' not in result_data:
                if score >= 9.0:
                    priority_label = "Critical"
                elif score >= 7.0:
                    priority_label = "High"
                elif score >= 5.0:
                    priority_label = "Medium"
                elif score >= 2.0:
                    priority_label = "Low"
                else:
                    priority_label = "Very Low"
                    
                result_data['priority_label'] = priority_label
            
            # Update context_relevance based on detected urgency
            context_relevance = float(result_data.get('context_relevance', 0.0))
            if has_urgent_context and earliest_context_date and context_relevance < 0.7:
                # Increase context relevance if urgent context is detected but not reflected in AI response
                days_difference = (earliest_context_date - current_date).total_seconds() / 86400
                if days_difference < 2:  # If we have urgent context within 48 hours
                    context_relevance = max(0.8, context_relevance)
                    logger.info(f"Increased context_relevance to {context_relevance} due to detected urgent context")
                
            # Adjust score based on urgent context if needed
            adjusted_score = score
            if has_urgent_context and score < 7.0 and earliest_context_date:
                days_difference = (earliest_context_date - current_date).total_seconds() / 86400
                if days_difference < 1:  # Less than 1 day
                    adjusted_score = max(9.0, score)
                    logger.info(f"Increased priority score from {score} to {adjusted_score} due to critical urgency")
                elif days_difference < 2:  # Less than 2 days
                    adjusted_score = max(8.0, score)
                    logger.info(f"Increased priority score from {score} to {adjusted_score} due to high urgency")
                
            return TaskPriority(
                score=adjusted_score,
                reasoning=result_data.get('reasoning', '') + ("\n(Score adjusted based on urgent context)" if adjusted_score > score else ""),
                urgency_factors=result_data.get('urgency_factors', []) + (["Urgent context detected"] if has_urgent_context else []),
                context_relevance=context_relevance
            )
            
        except Exception as e:
            logger.error(f"Error prioritizing task: {str(e)}")
            return TaskPriority(
                score=5.0,
                reasoning="Error in AI analysis, using default priority",
                urgency_factors=[],
                context_relevance=0.0
            )

    async def suggest_deadline(self, task_data: Dict[str, Any], context_data: List[Dict[str, Any]], 
                             current_workload: Optional[Dict[str, Any]] = None) -> DeadlineSuggestion:
        """
        Suggest a realistic deadline for a task based on complexity and context
        
        Args:
            task_data: Dictionary containing task information
            context_data: List of relevant context entries
            current_workload: Optional information about current task load
            
        Returns:
            DeadlineSuggestion object with deadline recommendation
        """
        try:
            current_date = timezone.now()
            context_summary = self._prepare_context_summary(context_data)
            workload_info = json.dumps(current_workload or {}, indent=2)
            
            # Check if there are urgent context items that should affect deadline
            urgent_contexts = [ctx for ctx in context_data if self._has_urgency_indicators(ctx)]
            has_urgent_context = len(urgent_contexts) > 0
            
            # Extract near-term dates from context if they exist
            context_dates = self._extract_dates_from_context(context_data, current_date)
            earliest_context_date = min(context_dates) if context_dates else None
            
            prompt = f"""
            Suggest a realistic deadline for the following task based on its complexity and current context:

            Task Information:
            - Title: {task_data.get('title', '')}
            - Description: {task_data.get('description', '')}
            - Category: {task_data.get('category', 'None')}
            - Estimated Duration: {task_data.get('estimated_duration', 'Unknown')} minutes
            - User Suggested Deadline: {task_data.get('deadline', 'None')}

            Current Context:
            {context_summary}

            Current Workload:
            {workload_info}

            Current Date/Time: {current_date.isoformat()}

            {'URGENT CONTEXT DETECTED: There are urgent items in the context that may require immediate attention and may affect this task deadline.' if has_urgent_context else ''}
            {'IMPORTANT DATE DETECTED: ' + earliest_context_date.strftime('%Y-%m-%d') + ' is an important date in the context that may affect this deadline.' if earliest_context_date else ''}

            IMPORTANT: The suggested deadline MUST be in the future relative to the current date ({current_date.strftime('%B %d, %Y')}). 
            DO NOT suggest any date in the past.

            Please provide a JSON response with:
            {{
                "suggested_deadline": "Future date in ISO format",
                "confidence": 0.85,
                "reasoning": "Detailed explanation for the suggested deadline",
                "factors_considered": ["factor1", "factor2", "factor3"],
                "context_relevance": 0.95,
                "urgent_context_impact": "High/Medium/Low/None"
            }}

            Consider:
            1. Task complexity and estimated duration
            2. Current workload and availability
            3. Context urgency indicators
            4. Buffer time for unexpected delays
            5. Dependencies and prerequisites
            6. Work-life balance considerations
            7. Realistic time estimation based on similar tasks

            Provide the deadline in ISO format and ensure it's realistic and achievable.
            """

            response = await self._generate_content_async(prompt)
            
            try:
                result_data = json.loads(response.text)
            except json.JSONDecodeError:
                result_data = self._extract_json_from_text(response.text)
            
            # Parse the suggested deadline
            deadline_str = result_data.get('suggested_deadline', '')
            try:
                suggested_deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                
                # Validate that the suggested deadline is in the future
                if suggested_deadline <= current_date:
                    logger.warning(f"AI suggested a deadline in the past: {suggested_deadline}. Using fallback date.")
                    # Set a fallback deadline 7 days from now
                    suggested_deadline = current_date + timedelta(days=7)
                    
                    # Update reasoning to mention the correction
                    original_reasoning = result_data.get('reasoning', '')
                    result_data['reasoning'] = f"[SYSTEM CORRECTION: Original suggested date was in the past. Adjusted to 7 days from now.] {original_reasoning}"
                    result_data['factors_considered'] = ["System correction applied"] + result_data.get('factors_considered', [])
                
            except (ValueError, AttributeError):
                # Fallback to a reasonable default (7 days from now)
                suggested_deadline = current_date + timedelta(days=7)
                result_data['reasoning'] = "Failed to parse suggested deadline, using default (7 days from now)"
            
            return DeadlineSuggestion(
                suggested_deadline=suggested_deadline,
                confidence=float(result_data.get('confidence', 0.5)),
                reasoning=result_data.get('reasoning', ''),
                factors_considered=result_data.get('factors_considered', [])
            )
            
        except Exception as e:
            logger.error(f"Error suggesting deadline: {str(e)}")
            return DeadlineSuggestion(
                suggested_deadline=timezone.now() + timedelta(days=7),
                confidence=0.5,
                reasoning="Error in AI analysis, using default deadline (7 days from now)",
                factors_considered=[]
            )

    async def suggest_categories_and_tags(self, task_data: Dict[str, Any], 
                                        existing_categories: List[str],
                                        existing_tags: List[str]) -> CategorySuggestion:
        """
        Suggest appropriate categories and tags for a task
        
        Args:
            task_data: Dictionary containing task information
            existing_categories: List of existing categories in the system
            existing_tags: List of existing tags in the system
            
        Returns:
            CategorySuggestion object with category and tag recommendations
        """
        try:
            prompt = f"""
            Suggest appropriate categories and tags for the following task:

            Task Information:
            - Title: {task_data.get('title', '')}
            - Description: {task_data.get('description', '')}
            - Current Category: {task_data.get('category', 'None')}

            Existing Categories: {', '.join(existing_categories)}
            Existing Tags: {', '.join(existing_tags)}

            Please provide a JSON response with:
            {{
                "suggested_categories": ["category1", "category2"],
                "suggested_tags": ["tag1", "tag2", "tag3"],
                "confidence": 0.9,
                "reasoning": "Explanation for the suggestions"
            }}

            Guidelines:
            1. Prefer existing categories/tags when appropriate
            2. Suggest new ones only if existing ones don't fit well
            3. Categories should be broad (e.g., "Work", "Personal", "Health")
            4. Tags should be specific (e.g., "urgent", "meeting", "research")
            5. Limit suggestions to 2-3 categories and 3-5 tags
            6. Consider the task's nature, urgency, and context
            """

            response = await self._generate_content_async(prompt)
            
            try:
                result_data = json.loads(response.text)
            except json.JSONDecodeError:
                result_data = self._extract_json_from_text(response.text)
            
            return CategorySuggestion(
                suggested_categories=result_data.get('suggested_categories', []),
                suggested_tags=result_data.get('suggested_tags', []),
                confidence=float(result_data.get('confidence', 0.5)),
                reasoning=result_data.get('reasoning', '')
            )
            
        except Exception as e:
            logger.error(f"Error suggesting categories and tags: {str(e)}")
            return CategorySuggestion(
                suggested_categories=[],
                suggested_tags=[],
                confidence=0.0,
                reasoning="Error in AI analysis"
            )

    async def suggest_schedule(self, task_data: Dict[str, Any], 
                            context_data: List[Dict[str, Any]],
                            user_preferences: Optional[Dict[str, Any]] = None,
                            current_workload: Optional[Dict[str, Any]] = None) -> SchedulingSuggestion:
        """
        Suggest optimal scheduling for a task based on context, workload, and user preferences
        
        Args:
            task_data: Dictionary containing task information
            context_data: List of relevant context entries
            user_preferences: Optional user preferences for scheduling
            current_workload: Optional information about current task load
            
        Returns:
            SchedulingSuggestion object with scheduling recommendations
        """
        try:
            # Prepare context summary
            context_summary = self._prepare_context_summary(context_data)
            
            # Extract time references from context
            current_date = timezone.now()
            context_dates = self._extract_dates_from_context(context_data, current_date)
            
            # Extract working hours from user preferences
            working_hours_start = "09:00"
            working_hours_end = "17:00"
            if user_preferences:
                if 'working_hours_start' in user_preferences:
                    working_hours_start = user_preferences['working_hours_start']
                if 'working_hours_end' in user_preferences:
                    working_hours_end = user_preferences['working_hours_end']
            
            # Prepare task information
            task_title = task_data.get('title', 'Untitled Task')
            task_description = task_data.get('description', '')
            task_priority = task_data.get('priority', 'medium')
            task_deadline = task_data.get('deadline')
            task_duration = task_data.get('estimated_duration', 60)  # Default to 60 minutes
            
            # Format deadline if it exists
            deadline_str = "No deadline specified"
            if task_deadline:
                try:
                    if isinstance(task_deadline, str):
                        deadline_date = datetime.fromisoformat(task_deadline.replace('Z', '+00:00'))
                    else:
                        deadline_date = task_deadline
                    deadline_str = deadline_date.strftime("%Y-%m-%d %H:%M")
                except (ValueError, TypeError):
                    deadline_str = str(task_deadline)
            
            # Format current workload information
            workload_info = "No workload information available"
            if current_workload:
                pending_tasks = current_workload.get('pending_tasks', 0)
                high_priority_tasks = current_workload.get('high_priority_tasks', 0)
                upcoming_deadlines = current_workload.get('upcoming_deadlines', [])
                
                workload_info = f"{pending_tasks} pending tasks, {high_priority_tasks} high priority tasks"
                if upcoming_deadlines:
                    workload_info += f", {len(upcoming_deadlines)} upcoming deadlines"
            
            # Format context dates if any
            context_dates_info = "No specific dates found in context"
            if context_dates:
                dates_str = [date.strftime("%Y-%m-%d") for date in context_dates[:3]]
                context_dates_info = f"Important dates in context: {', '.join(dates_str)}"
                if len(context_dates) > 3:
                    context_dates_info += f" and {len(context_dates) - 3} more"
            
            # Create prompt for scheduling suggestion
            prompt = f"""
            Suggest an optimal schedule for the following task based on the provided context, workload, and preferences.
            
            Task Information:
            - Title: {task_title}
            - Description: {task_description}
            - Priority: {task_priority}
            - Deadline: {deadline_str}
            - Estimated Duration: {task_duration} minutes
            
            Current Context:
            {context_summary}
            {context_dates_info}
            
            Current Workload:
            {workload_info}
            
            User Preferences:
            - Working Hours: {working_hours_start} to {working_hours_end}
            
            Current Date and Time: {current_date.strftime('%Y-%m-%d %H:%M')}
            
            Please provide a JSON response with the following structure:
            {{
                "suggested_start_time": "YYYY-MM-DD HH:MM",
                "suggested_end_time": "YYYY-MM-DD HH:MM",
                "confidence": 0.85,
                "reasoning": "Detailed explanation of why this time slot is suggested",
                "factors_considered": ["factor1", "factor2", "factor3"],
                "alternative_slots": [
                    {{
                        "start_time": "YYYY-MM-DD HH:MM",
                        "end_time": "YYYY-MM-DD HH:MM",
                        "reason": "Why this is an alternative option"
                    }}
                ]
            }}
            
            Guidelines for scheduling:
            1. High priority tasks should be scheduled earlier in the day when possible
            2. Tasks with approaching deadlines should be prioritized
            3. Consider context information for optimal timing
            4. Schedule within working hours unless the task is urgent
            5. Provide at least 2 alternative time slots
            6. If there are specific dates mentioned in the context that are relevant to this task, prioritize scheduling near those dates
            7. For tasks without deadlines, suggest reasonable timing based on priority and estimated duration
            """

            response = await self._generate_content_async(prompt)
            
            try:
                result_data = json.loads(response.text)
            except json.JSONDecodeError:
                result_data = self._extract_json_from_text(response.text)
                
                # If extraction failed, provide default values
                if not result_data:
                    logger.warning(f"Failed to parse JSON response for scheduling suggestion: {response.text[:200]}...")
                    result_data = {}
            
            # Parse the start and end times
            try:
                start_time_str = result_data.get('suggested_start_time')
                end_time_str = result_data.get('suggested_end_time')
                
                if start_time_str and end_time_str:
                    suggested_start_time = datetime.strptime(start_time_str, "%Y-%m-%d %H:%M")
                    suggested_end_time = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M")
                else:
                    # Default to tomorrow during working hours if no suggestion
                    tomorrow = current_date + timedelta(days=1)
                    tomorrow = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)  # 10:00 AM
                    suggested_start_time = tomorrow
                    suggested_end_time = tomorrow + timedelta(minutes=task_duration)
            except (ValueError, TypeError) as e:
                logger.error(f"Error parsing suggested times: {str(e)}")
                # Default to tomorrow during working hours
                tomorrow = current_date + timedelta(days=1)
                tomorrow = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)  # 10:00 AM
                suggested_start_time = tomorrow
                suggested_end_time = tomorrow + timedelta(minutes=task_duration)
            
            # Process alternative slots
            alternative_slots = []
            for alt_slot in result_data.get('alternative_slots', []):
                try:
                    alt_start = datetime.strptime(alt_slot.get('start_time'), "%Y-%m-%d %H:%M")
                    alt_end = datetime.strptime(alt_slot.get('end_time'), "%Y-%m-%d %H:%M")
                    alternative_slots.append({
                        'start_time': alt_start.isoformat(),
                        'end_time': alt_end.isoformat(),
                        'reason': alt_slot.get('reason', 'Alternative time slot')
                    })
                except (ValueError, TypeError):
                    # Skip invalid alternative slots
                    continue
            
            # If we don't have enough alternative slots, add some defaults
            while len(alternative_slots) < 2:
                # Add slots later in the day or next day
                next_slot_start = suggested_start_time + timedelta(hours=3)
                next_slot_end = next_slot_start + timedelta(minutes=task_duration)
                
                alternative_slots.append({
                    'start_time': next_slot_start.isoformat(),
                    'end_time': next_slot_end.isoformat(),
                    'reason': 'Automatically generated alternative'
                })
                
                # Move to next day for second alternative if needed
                suggested_start_time = next_slot_start
            
            return SchedulingSuggestion(
                suggested_start_time=suggested_start_time,
                suggested_end_time=suggested_end_time,
                confidence=float(result_data.get('confidence', 0.7)),
                reasoning=result_data.get('reasoning', 'Based on task priority and context'),
                factors_considered=result_data.get('factors_considered', ['Task priority', 'Estimated duration']),
                alternative_slots=alternative_slots
            )
            
        except Exception as e:
            logger.error(f"Error suggesting schedule: {str(e)}")
            # Return default scheduling suggestion
            tomorrow = current_date + timedelta(days=1)
            tomorrow = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)  # 10:00 AM
            return SchedulingSuggestion(
                suggested_start_time=tomorrow,
                suggested_end_time=tomorrow + timedelta(minutes=task_duration if 'task_duration' in locals() else 60),
                confidence=0.5,
                reasoning="Default suggestion due to error in processing",
                factors_considered=["Error recovery"],
                alternative_slots=[{
                    'start_time': (tomorrow + timedelta(hours=2)).isoformat(),
                    'end_time': (tomorrow + timedelta(hours=2, minutes=task_duration if 'task_duration' in locals() else 60)).isoformat(),
                    'reason': 'Automatically generated alternative'
                }]
            )
            
    async def enhance_task_description(self, task_data: Dict[str, Any], 
                                     context_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Enhance task description with context-aware details
        
        Args:
            task_data: Dictionary containing task information
            context_data: List of relevant context entries
            
        Returns:
            Dictionary with enhanced description or error information
        """
        try:
            context_summary = self._prepare_context_summary(context_data)
            
            prompt = f"""
            Enhance the following task description with relevant context and details:

            Original Task:
            - Title: {task_data.get('title', '')}
            - Description: {task_data.get('description', '')}

            Relevant Context:
            {context_summary}

            Please provide an enhanced description that:
            1. Maintains the original intent and scope
            2. Adds relevant context and background information
            3. Includes specific details that might be helpful
            4. Suggests potential steps or considerations
            5. Remains concise and actionable

            Return only the enhanced description text, not JSON.
            """

            response = await self._generate_content_async(prompt)
            enhanced_text = response.text.strip()
            
            return {
                "success": True,
                "enhanced_text": enhanced_text,
                "original_text": task_data.get('description', ''),
                "is_enhanced": True
            }
            
        except Exception as e:
            logger.error(f"Error enhancing task description: {str(e)}")
            return {
                "success": False,
                "enhanced_text": None,
                "original_text": task_data.get('description', ''),
                "error": str(e),
                "is_enhanced": False
            }

    async def _generate_content_async(self, prompt: str) -> Any:
        """
        Generate content using Gemini API asynchronously
        
        Args:
            prompt: The prompt to send to the AI model
            
        Returns:
            Generated response object
        """
        try:
            # Set retry parameters
            max_retries = 2
            retry_count = 0
            retry_delay = 1  # seconds
            
            # Add explicit instructions for JSON formatting
            if "JSON" in prompt:
                # Strengthen JSON instruction
                prompt = prompt + """
                
                IMPORTANT: Return ONLY valid, parseable JSON without any additional text, markdown formatting or code blocks.
                Do not include backticks, the word 'json', or any other text before or after the JSON object.
                The response should be a single, valid JSON object and nothing else.
                """
            
            loop = asyncio.get_event_loop()
            generation_config = {
                'temperature': 0.2,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': 1024,
            }
            
            while retry_count <= max_retries:
                try:
                    # Use functools.partial to prepare the synchronous function
                    generate_func = functools.partial(
                        self.model.generate_content,
                        contents=prompt,
                        generation_config=generation_config,
                        safety_settings=self.safety_settings
                    )
                    
                    # Run the synchronous function in the executor
                    response = await loop.run_in_executor(None, generate_func)
                    
                    # Check if response is valid
                    if hasattr(response, 'text') and response.text.strip():
                        return response
                    else:
                        raise ValueError("Empty or invalid response received from API")
                        
                except Exception as inner_e:
                    retry_count += 1
                    if retry_count > max_retries:
                        logger.error(f"All retries failed in Gemini API call: {str(inner_e)}")
                        raise
                    
                    logger.warning(f"Retry {retry_count} after error: {str(inner_e)}")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
            
            raise Exception("Failed to get valid response from Gemini API after retries")
            
        except Exception as e:
            logger.error(f"Error in Gemini API call: {str(e)}")
            raise

    def _prepare_context_summary(self, context_data: List[Dict[str, Any]]) -> str:
        """
        Prepare a summary of context data for use in prompts
        
        Args:
            context_data: List of context entry dictionaries
            
        Returns:
            String summarizing context entries with emphasis on urgent items
        """
        if not context_data:
            return "No relevant context available."
        
        # Sort context by urgency and recency
        sorted_context = sorted(context_data, 
                               key=lambda x: (self._has_urgency_indicators(x), 
                                            x.get('content_date', ''),
                                            x.get('relevance_score', 0)), 
                               reverse=True)
        
        summary_parts = ["IMPORTANT CONTEXT INFORMATION:"]
        
        # Extract urgency indicators and deadlines first as a special section
        urgent_contexts = [ctx for ctx in sorted_context if self._has_urgency_indicators(ctx)]
        if urgent_contexts:
            summary_parts.append("\nURGENT ITEMS AND DEADLINES:")
            for i, context in enumerate(urgent_contexts, 1):
                # Extract date if present
                date_info = context.get('content_date', 'Unknown date')
                content = context.get('content', '')[:500]
                
                # Check for time-related words and highlight them
                highlighted_content = self._highlight_time_references(content)
                
                summary_parts.append(f"""\n[URGENT ITEM {i}] - Date: {date_info}
{highlighted_content}""")
        
        # Add remaining context items
        summary_parts.append("\nADDITIONAL CONTEXT:")
        for i, context in enumerate(sorted_context[:5], 1):  # Limit to 5 most relevant
            if context not in urgent_contexts:  # Skip if already added as urgent
                summary_parts.append(f"""
                Context {i} ({context.get('source_type', 'unknown')}):
                Content: {context.get('content', '')[:500]}...
                Date: {context.get('content_date', 'Unknown')}
                """)
        
        return "\n".join(summary_parts)
        
    def _has_urgency_indicators(self, context: Dict[str, Any]) -> bool:
        """Check if context has urgency indicators or near dates"""
        content = context.get('content', '').lower()
        
        # First check for explicit urgency terms
        urgency_terms = ['urgent', 'asap', 'immediately', 'today', 'tomorrow', 'deadline', 
                        'due', 'meeting', 'schedule', 'important', 'priority', 'critical',
                        'approaching', 'soon', 'fast', 'quick', 'promptly']
        
        if any(term in content for term in urgency_terms):
            return True
        
        # Then check if the context has a date that's coming up soon
        try:
            current_date = timezone.now()
            # Get dates from this context item only
            context_dates = self._extract_dates_from_context([context], current_date)
            
            if context_dates:
                earliest_date = min(context_dates)
                days_until = (earliest_date - current_date).total_seconds() / 86400
                
                # If date is within a week (7 days), consider it urgent
                if days_until < 7:
                    logger.debug(f"Context considered urgent due to date {earliest_date.isoformat()} within {days_until:.1f} days")
                    return True
        except Exception as e:
            logger.debug(f"Error checking dates for urgency: {str(e)}")
            
        return False
    
    def _highlight_time_references(self, text: str) -> str:
        """Highlight time references in text"""
        time_terms = ['today', 'tomorrow', 'next week', 'meeting', 'schedule', 'deadline', 
                      'due date', 'urgent', 'asap', 'immediately', 'soon']
        
        result = text
        for term in time_terms:
            # Case-insensitive replacement to add emphasis
            pattern = re.compile(re.escape(term), re.IGNORECASE)
            result = pattern.sub(f"**{term.upper()}**", result)
            
        return result
        
    def _extract_dates_from_context(self, context_data: List[Dict[str, Any]], current_date: datetime) -> List[datetime]:
        """Extract dates from context data"""
        found_dates = []
        today = current_date.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        # First extract explicit dates from content_date fields
        for context in context_data:
            if 'content_date' in context and context['content_date']:
                try:
                    # If content_date is a string, try to parse it
                    if isinstance(context['content_date'], str):
                        try:
                            parsed_date = datetime.fromisoformat(context['content_date'])
                            found_dates.append(parsed_date)
                        except (ValueError, TypeError):
                            pass
                    # If it's already a datetime object, use it directly
                    elif isinstance(context['content_date'], datetime):
                        found_dates.append(context['content_date'])
                except Exception:
                    pass
                    
        # Patterns and parsing functions for natural language date extraction
        next_week = today + timedelta(days=7)  # Define next_week for date patterns
        
        # Then look for date references in context content
        date_patterns = [
            # ISO format dates (YYYY-MM-DD)
            (r'\d{4}-\d{1,2}-\d{1,2}', lambda x: datetime.fromisoformat(x.strip())),
            # Month day, year (July 8, 2025)
            (r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}', 
             lambda x: datetime.strptime(x.strip(), "%B %d, %Y")),
            # Day Month year (8 July 2025)
            (r'\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',
             lambda x: datetime.strptime(x.strip(), "%d %B %Y")),
            # Month day (July 8) - assume current year
            (r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?!,\s+\d{4})',
             lambda x: datetime.strptime(f"{x.strip()}, {current_date.year}", "%B %d, %Y")),
            # Tomorrow
            (r'\btomorrow\b', lambda x: tomorrow),
            # Today
            (r'\btoday\b', lambda x: today),
            # Next week
            (r'\bnext week\b', lambda x: next_week),
            # This weekend
            (r'\bthis weekend\b', lambda x: today + timedelta(days=(5 - today.weekday()) % 7)),
            # Day names (Monday, Tuesday, etc.)
            (r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b', 
             lambda x: today + timedelta(days=(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].index(x.strip().capitalize()) - today.weekday()) % 7)),
        ]
        
        for context in context_data:
            content = context.get('content', '')
            
            # Special handling for explicit "tomorrow at X" mentions
            tomorrow_time_match = re.search(r'tomorrow\s+at\s+(\d{1,2})(?:\s*:\s*(\d{1,2}))?\s*(am|pm|AM|PM)?', content)
            if tomorrow_time_match:
                try:
                    hour = int(tomorrow_time_match.group(1))
                    minute = int(tomorrow_time_match.group(2)) if tomorrow_time_match.group(2) else 0
                    am_pm = tomorrow_time_match.group(3).lower() if tomorrow_time_match.group(3) else None
                    
                    # Handle AM/PM
                    if am_pm == 'pm' and hour < 12:
                        hour += 12
                    elif am_pm == 'am' and hour == 12:
                        hour = 0
                        
                    date_with_time = tomorrow.replace(hour=hour, minute=minute)
                    found_dates.append(date_with_time)
                except (ValueError, AttributeError, IndexError):
                    found_dates.append(tomorrow)  # Fallback to just tomorrow
            
            # Check for each date pattern
            for pattern, date_parser in date_patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    try:
                        matched_text = match.group(0)
                        parsed_date = date_parser(matched_text)
                        found_dates.append(parsed_date)
                    except (ValueError, TypeError):
                        pass
        
        # If no dates found, add tomorrow as default for urgent items
        if not found_dates and any(self._has_urgency_indicators(ctx) for ctx in context_data):
            found_dates.append(tomorrow)
            
        # If still no dates found, add one week from today as fallback
        if not found_dates:
            found_dates.append(today + timedelta(days=7))
            
        return found_dates

    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from text response when direct parsing fails
        
        Args:
            text: Text containing JSON
            
        Returns:
            Parsed JSON dictionary or empty dict on failure
        """
        try:
            # First attempt: Try to find complete JSON object enclosed in braces
            json_match = re.search(r'\{[^{}]*((\{[^{}]*\})[^{}]*)*\}', text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            # Second attempt: Look for markdown JSON code blocks
            code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
            if code_block_match:
                try:
                    return json.loads(code_block_match.group(1))
                except json.JSONDecodeError:
                    pass
                
            # Third attempt: Try to manually extract key fields
            # This is a simple fallback parser for basic fields
            result = {}
            
            # Extract key fields that are expected in the response
            summary_match = re.search(r'"summary"\s*:\s*"([^"]*)"', text)
            if summary_match:
                result['summary'] = summary_match.group(1)
                
            # Extract arrays like key_topics
            topics_match = re.search(r'"key_topics"\s*:\s*\[([^\]]*)\]', text)
            if topics_match:
                topics_text = topics_match.group(1)
                # Extract quoted strings from the array
                topics = re.findall(r'"([^"]*)"', topics_text)
                result['key_topics'] = topics
            else:
                result['key_topics'] = []
                
            # If we have at least a summary, consider it a partial success
            if result.get('summary'):
                logger.info("Partially extracted JSON fields after parsing failure")
                return result
                
        except Exception as e:
            logger.error(f"Error during JSON extraction: {str(e)}")
        
        logger.warning(f"Failed to extract JSON from text: {text[:200]}...")
        return {"summary": "Content analysis failed", "key_topics": [], "urgency_indicators": [], "potential_tasks": [], "sentiment_score": 0, "time_references": []}


class AITaskManager:
    """
    High-level task manager that orchestrates AI services for task management
    """
    
    def __init__(self):
        self.ai_service = GeminiAIService()
    
    async def process_new_task(self, task_data: Dict[str, Any], 
                              context_data: List[Dict[str, Any]] = None,
                              user_preferences: Dict[str, Any] = None,
                              existing_categories: List[str] = None,
                              existing_tags: List[str] = None,
                              current_workload: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process a new task with full AI analysis
        
        Args:
            task_data: Task information
            context_data: Relevant context entries
            user_preferences: User preferences for AI analysis
            existing_categories: Available categories
            existing_tags: Available tags
            current_workload: Current task load information
            
        Returns:
            Dictionary with all AI analysis results
        """
        results = {}
        
        # Ensure context_data is at least an empty list, not None
        if context_data is None:
            context_data = []
            logger.info("No context data provided, using empty list")
        
        # Pre-analyze context to detect urgent items and important dates
        has_urgent_context = False
        urgent_contexts = []
        context_dates = []
        current_date = timezone.now()
        
        if context_data:
            # Extract dates from context first since we need them for enhanced urgency detection
            context_dates = self.ai_service._extract_dates_from_context(context_data, current_date)
            
            # Use dates to determine if context is urgent even without explicit urgency terms
            date_based_urgency = False
            if context_dates:
                earliest_date = min(context_dates)
                days_until = (earliest_date - current_date).total_seconds() / 86400
                logger.info(f"Earliest context date found: {earliest_date.isoformat()}, {days_until:.1f} days from now")
                
                # Consider anything within a week as at least somewhat urgent
                if days_until < 7:
                    date_based_urgency = True
                    logger.info(f"Date-based urgency detected: date within {days_until:.1f} days")
            
            # Identify urgent context items
            urgent_contexts = [ctx for ctx in context_data if self.ai_service._has_urgency_indicators(ctx)]
            has_urgent_context = len(urgent_contexts) > 0 or date_based_urgency
            
            if has_urgent_context:
                logger.info(f"Found {len(urgent_contexts)} urgent context items that may affect task analysis")
        
        # Log context analysis for debugging
        logger.debug(f"Context analysis: urgent={has_urgent_context}, dates_found={len(context_dates)}")
        
        try:
            # Run all AI analyses concurrently
            tasks = []
            task_types = []
            
            # Priority analysis - Always run this
            tasks.append(
                self.ai_service.prioritize_task(task_data, context_data, user_preferences)
            )
            task_types.append('priority')
            
            # Deadline suggestion
            tasks.append(
                self.ai_service.suggest_deadline(task_data, context_data, current_workload)
            )
            task_types.append('deadline')
            
            # Scheduling suggestion
            tasks.append(
                self.ai_service.suggest_schedule(task_data, context_data, user_preferences, current_workload)
            )
            task_types.append('scheduling')
            
            # Category and tag suggestions
            if existing_categories is not None and existing_tags is not None:
                tasks.append(
                    self.ai_service.suggest_categories_and_tags(
                        task_data, existing_categories, existing_tags
                    )
                )
                task_types.append('categorization')
            
            # Enhanced description - Always run this
            tasks.append(
                self.ai_service.enhance_task_description(task_data, context_data)
            )
            task_types.append('enhanced_description')
            
            # Execute all tasks concurrently
            if tasks:
                task_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results based on task types
                for i, (task_type, result) in enumerate(zip(task_types, task_results)):
                    if isinstance(result, Exception):
                        logger.error(f"Error in {task_type} analysis: {str(result)}")
                        if task_type == 'priority':
                            # Provide fallback priority with minimal information
                            results['priority'] = {
                                'score': 5.0,  # Medium priority as default
                                'priority_label': 'Medium', 
                                'reasoning': 'Default priority assigned due to analysis error',
                                'urgency_factors': ['Task requires attention'],
                                'context_relevance': 0.5,
                                'action_timeframe': 'As scheduled',
                                'impact_assessment': 'Impact could not be determined'
                            }
                        elif task_type == 'enhanced_description':
                            # Set enhanced description to original or empty string
                            results['enhanced_description'] = task_data.get('description', '')
                            results['enhanced_description_info'] = {
                                'error': str(result),
                                'is_enhanced': False,
                                'original_text': task_data.get('description', '')
                            }
                        continue
                    
                    # Process successful results
                    if task_type == 'priority':
                        priority_result = result
                        
                        # Check if we need to override based on urgent context
                        score = getattr(priority_result, 'score', 5.0)
                        priority_label = getattr(priority_result, 'priority_label', 
                                               self._get_priority_label(score))
                        context_relevance = getattr(priority_result, 'context_relevance', 0.5)
                        reasoning = getattr(priority_result, 'reasoning', '')
                        urgency_factors = getattr(priority_result, 'urgency_factors', [])
                        
                        # If the context has dates or is urgent but AI didn't give it enough weight
                        if context_dates:
                            earliest_date = min(context_dates)
                            days_until = (earliest_date - current_date).total_seconds() / 86400
                            
                            # Override the score based on how close the date is
                            # More aggressive overrides for nearer dates
                            if days_until < 1:  # Within 24 hours
                                score = max(9.5, score)
                                priority_label = "Critical"
                                context_relevance = 0.98
                                urgency_factors.append("Critical deadline detected within 24 hours")
                                reasoning += "\n(Priority automatically elevated to Critical due to deadline within 24 hours)"
                                logger.info(f"Elevated task priority to Critical due to context date within 24 hours")
                            elif days_until < 2:  # Within 48 hours
                                score = max(8.5, score)
                                priority_label = "High"
                                context_relevance = max(0.9, context_relevance)
                                urgency_factors.append("Urgent deadline within 48 hours")
                                reasoning += "\n(Priority adjusted due to deadline within 48 hours)"
                                logger.info(f"Adjusted task priority due to context date within 48 hours")
                            elif days_until < 4:  # Within 4 days
                                score = max(7.5, score)
                                priority_label = "High" if score >= 7.0 else priority_label
                                context_relevance = max(0.8, context_relevance)
                                urgency_factors.append("Upcoming deadline within 4 days")
                            elif days_until < 7:  # Within a week
                                score = max(6.5, score)
                                priority_label = self._get_priority_label(score)  # Recalculate label
                                context_relevance = max(0.7, context_relevance)
                                urgency_factors.append("Upcoming deadline within a week")
                                
                        results['priority'] = {
                            'score': score,
                            'priority_label': priority_label,
                            'reasoning': reasoning,
                            'urgency_factors': urgency_factors,
                            'context_relevance': context_relevance,
                            'action_timeframe': getattr(priority_result, 'action_timeframe', ''),
                            'impact_assessment': getattr(priority_result, 'impact_assessment', '')
                        }
                    elif task_type == 'deadline':
                        deadline_result = result
                        
                        # Extract suggested deadline from result
                        suggested_deadline = getattr(deadline_result, 'suggested_deadline', 
                                                  datetime.now() + timedelta(days=7))
                        confidence = getattr(deadline_result, 'confidence', 0.7)
                        reasoning = getattr(deadline_result, 'reasoning', 'Based on task details')
                        factors = getattr(deadline_result, 'factors_considered', [])
                        
                        # Always check if we can improve deadline based on context dates
                        if context_dates:
                            earliest_date = min(context_dates)
                            days_until = (earliest_date - current_date).total_seconds() / 86400
                            
                            # For items with dates, align the deadline with the context date
                            # More aggressive overrides for nearer dates and lower AI confidence
                            if days_until < 2 or (days_until < 7 and confidence < 0.85):
                                suggested_deadline = earliest_date
                                confidence = 0.98 if days_until < 2 else 0.9
                                reasoning += f"\n(Deadline automatically aligned with important date: {earliest_date.strftime('%Y-%m-%d')})"
                                factors.append("Context date alignment")
                                logger.info(f"Aligned deadline with context date: {earliest_date.isoformat()}, {days_until:.1f} days from now")
                            # For dates within a week, at least move the deadline closer if AI's was further out
                            elif days_until < 7:
                                ai_days_until = (suggested_deadline - current_date).total_seconds() / 86400
                                if ai_days_until > days_until + 1:  # If AI's deadline is more than 1 day later than context date
                                    suggested_deadline = earliest_date + timedelta(days=1)  # Add 1 day buffer
                                    confidence = max(0.85, confidence)
                                    reasoning += f"\n(Deadline adjusted to be closer to important date: {earliest_date.strftime('%Y-%m-%d')})"
                                    factors.append("Context date proximity adjustment")
                                    logger.info(f"Adjusted deadline to be closer to context date: now {suggested_deadline.isoformat()}")
                        
                        results['deadline'] = {
                            'suggested_deadline': suggested_deadline.isoformat(),
                            'confidence': confidence,
                            'reasoning': reasoning,
                            'factors_considered': factors
                        }
                    elif task_type == 'categorization':
                        category_result = result
                        results['categorization'] = {
                            'suggested_categories': getattr(category_result, 'suggested_categories', []),
                            'suggested_tags': getattr(category_result, 'suggested_tags', []),
                            'confidence': getattr(category_result, 'confidence', 0.5),
                            'reasoning': getattr(category_result, 'reasoning', '')
                        }
                    elif task_type == 'scheduling':
                        scheduling_result = result
                        
                        # Format the scheduling suggestion results
                        results['scheduling'] = {
                            'suggested_start_time': getattr(scheduling_result, 'suggested_start_time', datetime.now() + timedelta(days=1)).isoformat(),
                            'suggested_end_time': getattr(scheduling_result, 'suggested_end_time', datetime.now() + timedelta(days=1, hours=1)).isoformat(),
                            'confidence': getattr(scheduling_result, 'confidence', 0.7),
                            'reasoning': getattr(scheduling_result, 'reasoning', 'Based on task details and context'),
                            'factors_considered': getattr(scheduling_result, 'factors_considered', ['Task priority', 'Estimated duration']),
                            'alternative_slots': getattr(scheduling_result, 'alternative_slots', [])
                        }
                        
                        # Log the scheduling suggestion
                        logger.info(f"Scheduling suggestion for task '{task_data.get('title', '')}': "
                                  f"{getattr(scheduling_result, 'suggested_start_time', '').isoformat()} - "
                                  f"{getattr(scheduling_result, 'suggested_end_time', '').isoformat()}")
                        
                    elif task_type == 'enhanced_description':
                        enhanced_description_result = result
                        if enhanced_description_result.get('success', False):
                            results['enhanced_description'] = enhanced_description_result.get('enhanced_text', 
                                                                                           task_data.get('description', ''))
                            results['enhanced_description_info'] = {
                                'original_text': enhanced_description_result.get('original_text', ''),
                                'is_enhanced': enhanced_description_result.get('is_enhanced', False)
                            }
                        else:
                            # If enhancement failed, use original description
                            results['enhanced_description'] = task_data.get('description', '')
                            results['enhanced_description_info'] = {
                                'error': enhanced_description_result.get('error', 'Unknown error'),
                                'is_enhanced': False,
                                'original_text': task_data.get('description', '')
                            }
            
        except Exception as e:
            logger.error(f"Error in process_new_task: {str(e)}")
            results['error'] = str(e)
        
        return results

    def _get_priority_label(self, score: float) -> str:
        """Get a text label for a priority score"""
        if score >= 9.0:
            return "Critical"
        elif score >= 7.0:
            return "High"
        elif score >= 5.0:
            return "Medium"
        elif score >= 2.0:
            return "Low"
        else:
            return "Very Low"
            
        # Note: The threshold for Low priority was lowered from 3.0 to 2.0
        # This makes it easier for simple tasks to be classified as Low priority
    
    async def analyze_daily_context(self, context_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze multiple context entries and return insights
        
        Args:
            context_entries: List of context entry dictionaries
            
        Returns:
            List of analysis results for each context entry
        """
        results = []
        
        try:
            # Process context entries concurrently
            tasks = [
                self.ai_service.analyze_context(
                    entry.get('content', ''), 
                    entry.get('source_type', 'unknown')
                )
                for entry in context_entries
            ]
            
            analysis_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(analysis_results):
                if not isinstance(result, Exception):
                    results.append({
                        'context_id': context_entries[i].get('id'),
                        'summary': result.summary,
                        'key_topics': result.key_topics,
                        'urgency_indicators': result.urgency_indicators,
                        'potential_tasks': result.potential_tasks,
                        'sentiment_score': result.sentiment_score,
                        'time_references': result.time_references
                    })
                else:
                    logger.error(f"Error analyzing context entry {i}: {str(result)}")
                    results.append({
                        'context_id': context_entries[i].get('id'),
                        'error': str(result)
                    })
        
        except Exception as e:
            logger.error(f"Error in analyze_daily_context: {str(e)}")
        
        return results


# Global AI manager instance
ai_manager = AITaskManager()

