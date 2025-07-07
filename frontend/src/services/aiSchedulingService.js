import { API_URL } from '../config/constants';
import apiService from '../lib/api';
import { fetchCalendarEvents, fetchTimeBlocks } from './calendarService';

/**
 * Get AI-powered scheduling suggestions for a task
 * @param {string} token - Authentication token
 * @param {Object} taskData - Task data including title, description, priority, deadline, etc.
 * @param {Date} startDate - Start date for scheduling window (defaults to today)
 * @param {Date} endDate - End date for scheduling window (defaults to 7 days from today)
 * @returns {Promise<Object>} - Scheduling suggestions
 */
export const getSchedulingSuggestions = async (token, taskData, startDate = null, endDate = null) => {
  try {
    // Default to today if no start date provided
    if (!startDate) {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }
    
    // Default to 7 days from start date if no end date provided
    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Format dates for API
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    // Get existing calendar events and time blocks for the date range
    const [events, timeBlocks] = await Promise.all([
      fetchCalendarEvents(token, { start_date: formattedStartDate, end_date: formattedEndDate }),
      fetchTimeBlocks(token, { start_date: formattedStartDate, end_date: formattedEndDate })
    ]);
    
    // Prepare request data
    const requestData = {
      task: taskData,
      calendar_events: events,
      time_blocks: timeBlocks,
      start_date: formattedStartDate,
      end_date: formattedEndDate
    };
    
    // Call the backend API for scheduling suggestions
    const response = await fetch(`${API_URL}/ai-scheduling-suggestions/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`Error getting scheduling suggestions: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getSchedulingSuggestions:', error);
    
    // Fallback to local scheduling logic if API fails
    return generateLocalSchedulingSuggestions(taskData, startDate, endDate);
  }
};

/**
 * Generate scheduling suggestions locally when API fails
 * @param {Object} taskData - Task data
 * @param {Date} startDate - Start date for scheduling window
 * @param {Date} endDate - End date for scheduling window
 * @returns {Object} - Scheduling suggestions
 */
const generateLocalSchedulingSuggestions = (taskData, startDate, endDate) => {
  // Get current date and time
  const now = new Date();
  
  // Default duration in minutes (1 hour if not specified)
  const duration = taskData.estimated_duration ? parseInt(taskData.estimated_duration) : 60;
  
  // Calculate suggested start time based on priority and deadline
  let suggestedStartTime = new Date(now);
  let suggestedEndTime = new Date(now);
  
  // If high priority, schedule soon (within next 24 hours)
  if (taskData.priority === 'high') {
    // Add 1 hour to current time for high priority tasks
    suggestedStartTime.setHours(suggestedStartTime.getHours() + 1);
  } 
  // If medium priority, schedule within next 48 hours
  else if (taskData.priority === 'medium') {
    // Add 24 hours to current time for medium priority tasks
    suggestedStartTime.setHours(suggestedStartTime.getHours() + 24);
  } 
  // If low priority, schedule within next week
  else {
    // Add 3 days to current time for low priority tasks
    suggestedStartTime.setHours(suggestedStartTime.getHours() + 72);
  }
  
  // If there's a deadline, make sure we schedule before it
  if (taskData.deadline) {
    const deadline = new Date(taskData.deadline);
    deadline.setHours(23, 59, 59, 999);
    
    // If deadline is before our suggested time, adjust
    if (deadline < suggestedStartTime) {
      // Schedule 24 hours before deadline for high priority
      if (taskData.priority === 'high') {
        suggestedStartTime = new Date(deadline);
        suggestedStartTime.setHours(suggestedStartTime.getHours() - 24);
      } 
      // Schedule 48 hours before deadline for medium priority
      else if (taskData.priority === 'medium') {
        suggestedStartTime = new Date(deadline);
        suggestedStartTime.setHours(suggestedStartTime.getHours() - 48);
      }
      // Schedule 72 hours before deadline for low priority
      else {
        suggestedStartTime = new Date(deadline);
        suggestedStartTime.setHours(suggestedStartTime.getHours() - 72);
      }
    }
  }
  
  // Ensure start time is during working hours (9 AM - 5 PM)
  if (suggestedStartTime.getHours() < 9) {
    suggestedStartTime.setHours(9, 0, 0, 0);
  } else if (suggestedStartTime.getHours() >= 17) {
    // Move to 9 AM next day
    suggestedStartTime.setDate(suggestedStartTime.getDate() + 1);
    suggestedStartTime.setHours(9, 0, 0, 0);
  }
  
  // Calculate end time based on duration
  suggestedEndTime = new Date(suggestedStartTime);
  suggestedEndTime.setMinutes(suggestedEndTime.getMinutes() + duration);
  
  // If end time exceeds 5 PM, adjust to next day
  if (suggestedEndTime.getHours() >= 17) {
    // If task is short enough to fit in remaining time before 5 PM
    if (suggestedEndTime.getHours() === 17 && suggestedEndTime.getMinutes() <= 30) {
      // Keep it as is, it's close enough to 5 PM
    } else {
      // Move to next day
      suggestedStartTime.setDate(suggestedStartTime.getDate() + 1);
      suggestedStartTime.setHours(9, 0, 0, 0);
      suggestedEndTime = new Date(suggestedStartTime);
      suggestedEndTime.setMinutes(suggestedEndTime.getMinutes() + duration);
    }
  }
  
  // Ensure we're not scheduling on weekends
  const dayOfWeek = suggestedStartTime.getDay();
  if (dayOfWeek === 0) { // Sunday
    suggestedStartTime.setDate(suggestedStartTime.getDate() + 1); // Move to Monday
    suggestedEndTime = new Date(suggestedStartTime);
    suggestedEndTime.setMinutes(suggestedEndTime.getMinutes() + duration);
  } else if (dayOfWeek === 6) { // Saturday
    suggestedStartTime.setDate(suggestedStartTime.getDate() + 2); // Move to Monday
    suggestedEndTime = new Date(suggestedStartTime);
    suggestedEndTime.setMinutes(suggestedEndTime.getMinutes() + duration);
  }
  
  return {
    suggested_start_time: suggestedStartTime.toISOString(),
    suggested_end_time: suggestedEndTime.toISOString(),
    reasoning: `Scheduling based on task priority (${taskData.priority}) and estimated duration (${duration} minutes).`,
    confidence_score: 0.7 // Lower confidence since this is fallback logic
  };
};

/**
 * Create an optimal time block for a task using AI suggestions
 * @param {string} token - Authentication token
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} - Created time block
 */
export const createOptimalTimeBlock = async (token, taskData) => {
  try {
    // Get scheduling suggestions
    const suggestions = await getSchedulingSuggestions(token, taskData);
    
    // Create time block with suggested times
    const timeBlockData = {
      task: taskData.id,
      task_title: taskData.title,
      start_time: suggestions.suggested_start_time,
      end_time: suggestions.suggested_end_time,
      status: 'scheduled',
      notes: `AI-scheduled time block for task: ${taskData.title}`,
    };
    
    // Call the API to create the time block
    const response = await fetch(`${API_URL}/tasks/time-blocks/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(timeBlockData)
    });
    
    if (!response.ok) {
      throw new Error(`Error creating time block: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      timeBlock: data,
      suggestions
    };
  } catch (error) {
    console.error('Error in createOptimalTimeBlock:', error);
    throw error;
  }
};

/**
 * Get optimal scheduling for multiple tasks
 * @param {string} token - Authentication token
 * @param {Array} tasks - Array of task objects
 * @returns {Promise<Object>} - Optimized schedule
 */
export const getOptimizedSchedule = async (token, tasks) => {
  try {
    // Ensure we have a valid token using our consistent approach
    if (!token) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      token = userData.token || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
    }
    
    // Call the backend API for optimized scheduling
    const response = await fetch(`${API_URL}/optimize-schedule/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tasks })
    });
    
    if (!response.ok) {
      throw new Error(`Error optimizing schedule: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getOptimizedSchedule:', error);
    
    // Fallback to simple scheduling
    const schedule = [];
    
    // Sort tasks by priority and deadline
    const sortedTasks = [...tasks].sort((a, b) => {
      // First by priority (high > medium > low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by deadline (earlier deadline first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      } else if (a.deadline) {
        return -1; // a has deadline, b doesn't
      } else if (b.deadline) {
        return 1; // b has deadline, a doesn't
      }
      
      return 0;
    });
    
    // Generate suggestions for each task
    for (const task of sortedTasks) {
      const suggestion = generateLocalSchedulingSuggestions(task);
      schedule.push({
        task_id: task.id,
        task_title: task.title,
        suggested_start_time: suggestion.suggested_start_time,
        suggested_end_time: suggestion.suggested_end_time,
        priority: task.priority,
        reasoning: suggestion.reasoning
      });
    }
    
    return { schedule };
  }
};
