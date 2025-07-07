/**
 * API Service Layer for Smart Todo List Application
 * 
 * This module handles all communication with the Django backend API
 */

import { API_URL } from '../config/constants';

const API_BASE_URL = API_URL;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  constructor() {
    // Try to get token from userData first, then fallback to authToken
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    this.token = userData.token || localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
      
      // Also update token in userData if it exists
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData) {
        userData.token = token;
        localStorage.setItem('userData', JSON.stringify(userData));
      }
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0, { originalError: error });
    }
  }

  // Task operations
  async getTasks(filters = {}) {
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
    const endpoint = queryString ? `/tasks/tasks/?${queryString}` : '/tasks/tasks/';
    return this.request(endpoint);
  }
  
  async createTask(taskData) {
    return this.request('/tasks/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }
  
  async updateTask(id, taskData) {
    return this.request(`/tasks/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(taskData),
    });
  }
  
  async deleteTask(id) {
    return this.request(`/tasks/tasks/${id}/`, {
      method: 'DELETE',
    });
  }
  
  // Authentication
  async login(username, password) {
    const response = await this.request('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
      
      // Extract user data from the response if it exists
      const userData = {
        username,
        token: response.token,
        email: response.email || ``,
        first_name: response.first_name,
        last_name: response.last_name,
        displayName: (response.first_name && response.last_name) ? 
          `${response.first_name} ${response.last_name}` : username
      };
      
      // Store user data in localStorage for persistence
      localStorage.setItem('userData', JSON.stringify(userData));
    }
    
    return response;
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('userData');
  }
  
  async getUserProfile() {
    // Check for token using our consistent approach
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const token = this.token || userData.token || localStorage.getItem('authToken');
    
    if (!token) {
      // No token means user is not logged in
      return null;
    }
    
    // If we already have user data in localStorage, return it
    if (userData && userData.username) {
      return userData;
    }
    
    try {
      // Try to fetch user profile from the backend
      const userData = await this.request('/auth/user/');
      
      // Create a complete user object with data from API
      const completeUserData = {
        ...userData,
        token: token,
        // Ensure we have a displayName for UI purposes
        displayName: userData.first_name && userData.last_name ? 
          `${userData.first_name} ${userData.last_name}` : 
          userData.username
      };
      
      // Save the user data to localStorage for future use
      localStorage.setItem('userData', JSON.stringify(completeUserData));
      
      return completeUserData;
    } catch (err) {
      console.error('Failed to fetch user profile from API:', err);
      
      // Try to get user data from localStorage as fallback
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          return JSON.parse(storedUserData);
        } catch (parseErr) {
          console.error('Failed to parse stored user data', parseErr);
        }
      }
      
      // If all else fails, return minimal user data
      return {
        username: 'user',
        token: token,
        displayName: 'User'
      };
    }
  }

  // Tasks API
  async getTasks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/tasks/?${queryString}` : '/tasks/';
    return this.request(endpoint);
  }

  async getTask(id) {
    return this.request(`/tasks/${id}/`);
  }

  async createTask(taskData) {
    return this.request('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id, taskData) {
    return this.request(`/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}/`, {
      method: 'DELETE',
    });
  }

  async markTaskComplete(id) {
    return this.request(`/tasks/${id}/mark_complete/`, {
      method: 'POST',
    });
  }

  async markTaskInProgress(id) {
    return this.request(`/tasks/${id}/mark_in_progress/`, {
      method: 'POST',
    });
  }

  async getOverdueTasks() {
    return this.request('/tasks/overdue/');
  }

  async getUpcomingTasks() {
    return this.request('/tasks/upcoming/');
  }

  async getHighPriorityTasks() {
    return this.request('/tasks/high_priority/');
  }

  // Categories API
  async getCategories() {
    return this.request('/categories/');
  }

  async getCategoriesWithStats() {
    return this.request('/categories/with_stats/');
  }

  async createCategory(categoryData) {
    return this.request('/categories/', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(id, categoryData) {
    return this.request(`/categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}/`, {
      method: 'DELETE',
    });
  }

  // Tags API
  async getTags() {
    return this.request('/tags/');
  }

  async getTagsWithStats() {
    return this.request('/tags/with_stats/');
  }

  async createTag(tagData) {
    return this.request('/tags/', {
      method: 'POST',
      body: JSON.stringify(tagData),
    });
  }

  // Context Entries API
  async getContextEntries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/context-entries/?${queryString}` : '/context-entries/';
    return this.request(endpoint);
  }

  async createContextEntry(contextData) {
    return this.request('/context-entries/', {
      method: 'POST',
      body: JSON.stringify(contextData),
    });
  }

  async getUnprocessedContext() {
    return this.request('/context-entries/unprocessed/');
  }

  async getRecentContext() {
    return this.request('/context-entries/recent/');
  }

  // Statistics API
  async getTaskStats() {
    return this.request('/stats/');
  }

  async getTaskAnalytics(filters = {}) {
    return this.request('/analytics/task-analytics/', {
      method: 'GET',
      params: filters
    });
  }

  async getProductivityInsights(filters = {}) {
    return this.request('/analytics/productivity-insights/', {
      method: 'GET',
      params: filters
    });
  }

  async getProductivityTrend(days = 7) {
    return this.request(`/analytics/productivity-data/?days=${days}`);
  }

  async getWorkloadAnalysis() {
    return this.request('/analytics/workload-analysis/');
  }

  async getAIStats(timeRange = 30) {
    return this.request(`/analytics/ai-stats/?time_range=${timeRange}`);
  }

  async getContextInsights(timeRange = 30) {
    return this.request(`/analytics/context-insights/?time_range=${timeRange}`);
  }
  
  /**
   * Get AI-powered task prioritization based on context and user history
   * @param {Object} options - Options for task prioritization
   * @param {boolean} options.refresh_context - Whether to refresh context data before prioritizing
   * @returns {Promise<Object>} Prioritized tasks with AI scores and recommendations
   */
  async getTaskPrioritization(options = {}) {
    const queryParams = new URLSearchParams();
    
    // Add refresh_context parameter if provided
    if (options.refresh_context) {
      queryParams.append('refresh_context', 'true');
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/prioritize-tasks/?${queryString}` : '/analytics/prioritize-tasks/';
    
    return this.request(endpoint);
  }

  async getDashboardData() {
    return this.request('/dashboard/');
  }

  // Bulk Operations
  async bulkUpdateTasks(taskIds, updates) {
    return this.request('/bulk-update/', {
      method: 'POST',
      body: JSON.stringify({
        task_ids: taskIds,
        updates: updates,
      }),
    });
  }

  async bulkDeleteTasks(taskIds) {
    return this.request('/bulk-delete/', {
      method: 'DELETE',
      body: JSON.stringify({
        task_ids: taskIds,
      }),
    });
  }

  // Context API
  async getContextEntries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/context-entries/?${queryString}` : '/context-entries/';
    return this.request(endpoint);
  }

  async getContextEntry(id) {
    return this.request(`/context-entries/${id}/`);
  }

  async createContextEntry(entryData) {
    return this.request('/context-entries/', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateContextEntry(id, entryData) {
    return this.request(`/context-entries/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(entryData),
    });
  }

  async deleteContextEntry(id) {
    return this.request(`/context-entries/${id}/`, {
      method: 'DELETE',
    });
  }

  // Analytics API
  async getWorkloadAnalysis() {
    return this.request('/analytics/workload-analysis/');
  }

  async getTaskPrioritization() {
    return this.request('/analytics/prioritize-tasks/');
  }

  // AI Service API
  async analyzeContext(content, sourceType, contentDate = null) {
    return this.request('/ai/analyze-context/', {
      method: 'POST',
      body: JSON.stringify({
        content,
        source_type: sourceType,
        content_date: contentDate,
      }),
    });
  }

  async getAITaskSuggestions(taskData, includeContext = true, contextDaysBack = 7) {
    return this.request('/ai/task-suggestions/', {
      method: 'POST',
      body: JSON.stringify({
        task: taskData,
        include_context: includeContext,
        context_days_back: contextDaysBack,
      }),
    });
  }

  async prioritizeTasks(taskIds, includeContext = true) {
    return this.request('/analytics/prioritize-tasks/', {
      method: 'POST',
      body: JSON.stringify({
        task_ids: taskIds,
        include_context: includeContext
      })
    });
  }

  async getAIInsights(daysBack = 7) {
    const params = { time_range: daysBack };
    const queryString = new URLSearchParams(params).toString();
    console.log(`Calling AI insights endpoint: /analytics/ai-stats/?${queryString}`);
    try {
      const response = await this.request(`/analytics/context-insights/?${queryString}`);
      console.log('AI insights response:', response);
      return response;
    } catch (error) {
      console.error('Error in getAIInsights:', error);
      throw error;
    }
  }

  async getContextInsights(daysBack = 7, sourceType = null, limit = 20) {
    const params = { time_range: daysBack, limit };
    if (sourceType) params.source_type = sourceType;
    
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/analytics/context-insights/?${queryString}`);
  }

  async getWorkloadAnalysis() {
    return this.request('/ai/workload-analysis/');
  }

  async getAIStats(daysBack = 30) {
    return this.request(`/ai/ai-stats/?days_back=${daysBack}`);
  }

  async getTaskCompletionTrend(days = 7) {
    return this.request(`/analytics/completion-trend/?days=${days}`);
  }

  // Data Management
  async exportData() {
    return this.request('/data/export/', {
      method: 'GET'
    });
  }
  
  async importData(data) {
    return this.request('/data/import/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // Health Check
  async healthCheck() {
    // Health check doesn't require authentication
    const url = 'http://localhost:8000/health/';
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }
      
      return await response.json();
    } catch (error) {
      throw new ApiError('Health check failed', 0, { originalError: error });
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Export the ApiError class for error handling
export { ApiError };

