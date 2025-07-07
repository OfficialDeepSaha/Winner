/**
 * Task Service for Smart Todo List Application
 * 
 * This module handles all task-related API calls
 */

import { API_URL } from '../config/constants';

/**
 * Fetch tasks with optional filters
 * @param {string} token - Authentication token
 * @param {Object} filters - Optional filters (status, priority, etc.)
 * @returns {Promise<Array>} - Array of task objects
 */
export const fetchTasks = async (token, filters = {}) => {
  try {
    // Ensure we have a valid token using our consistent approach
    if (!token) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      token = userData.token || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
    }
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array values (like multiple statuses)
        value.forEach(v => queryParams.append(key, v));
      } else if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `${API_URL}/tasks/?${queryString}` : `${API_URL}/tasks/`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching tasks: ${response.status}`);
    }
    
    const data = await response.json();
    // Return paginated results or full data
    return Array.isArray(data) ? data : data.results;
  } catch (error) {
    console.error('Error in fetchTasks:', error);
    throw error;
  }
};

/**
 * Create a new task
 * @param {string} token - Authentication token
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} - Created task object
 */
export const createTask = async (token, taskData) => {
  try {
    const response = await fetch(`${API_URL}/tasks/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating task: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in createTask:', error);
    throw error;
  }
};

/**
 * Update an existing task
 * @param {string} token - Authentication token
 * @param {number} taskId - Task ID
 * @param {Object} taskData - Updated task data
 * @returns {Promise<Object>} - Updated task object
 */
export const updateTask = async (token, taskId, taskData) => {
  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating task: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in updateTask:', error);
    throw error;
  }
};

/**
 * Delete a task
 * @param {string} token - Authentication token
 * @param {number} taskId - Task ID
 * @returns {Promise<void>}
 */
export const deleteTask = async (token, taskId) => {
  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting task: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTask:', error);
    throw error;
  }
};
