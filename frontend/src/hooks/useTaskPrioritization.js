import { useState, useEffect, useCallback } from 'react';
import apiService from '../lib/api';

/**
 * Hook for accessing AI-powered task prioritization
 * Uses context entries and task metadata to determine optimal task order
 */
export default function useTaskPrioritization() {
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiPrioritizationEnabled, setAiPrioritizationEnabled] = useState(true);

  /**
   * Fetch AI task prioritization data
   * @param {Object} options - Options for fetching prioritized tasks
   * @param {boolean} options.refresh_context - Whether to refresh context data before prioritizing
   */
  const fetchPrioritizedTasks = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Pass refresh_context parameter to the API to get real-time context analysis
      const response = await apiService.getTaskPrioritization(options);
      setPrioritizedTasks(response.prioritized_tasks || []);
      setRecommendations(response.recommendations || []);
      setAiPrioritizationEnabled(response.ai_prioritization_enabled !== false); // Default to true if not specified
      
      // Return the response for chaining
      return response;
    } catch (err) {
      console.error('Error fetching prioritized tasks:', err);
      setError('Failed to load AI task prioritization. Please try again.');
      throw err; // Re-throw to allow error handling in the component
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get priority suggestion for a specific task based on title and description
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @returns {string} Suggested priority
   */
  const getPrioritySuggestion = useCallback((title, description) => {
    if (!title || prioritizedTasks.length === 0) return null;
    
    // Normalize text for comparison
    const normalizeText = (text) => text.toLowerCase().trim();
    const normalizedTitle = normalizeText(title);
    
    // Find similar tasks in prioritized tasks based on title
    for (const task of prioritizedTasks) {
      if (normalizeText(task.title).includes(normalizedTitle) || 
          normalizedTitle.includes(normalizeText(task.title))) {
        
        // Map AI priority score to priority level
        const score = task.ai_priority_score || 0;
        if (score >= 80) return 'urgent';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
      }
    }
    
    return null;
  }, [prioritizedTasks]);
  
  /**
   * Apply AI prioritization to a list of tasks
   * @param {Array} tasks - List of tasks to prioritize
   * @returns {Array} Prioritized tasks with added AI scores
   */
  const applyAIPrioritization = useCallback((tasks) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return tasks;
    if (!aiPrioritizationEnabled || prioritizedTasks.length === 0) return tasks;
    
    // Create map of task IDs to AI priority scores
    const priorityMap = {};
    for (const task of prioritizedTasks) {
      priorityMap[task.id] = {
        aiPriorityScore: task.ai_priority_score,
        factors: task.factors
      };
    }
    
    // Add AI priority info to each task
    const enhancedTasks = tasks.map(task => {
      const priorityInfo = priorityMap[task.id];
      return {
        ...task,
        aiPriorityScore: priorityInfo?.aiPriorityScore || 0,
        aiPriorityFactors: priorityInfo?.factors || null
      };
    });
    
    // Sort by AI priority if enabled
    return enhancedTasks.sort((a, b) => 
      (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0)
    );
  }, [prioritizedTasks, aiPrioritizationEnabled]);
  
  // Initialize on mount
  useEffect(() => {
    fetchPrioritizedTasks();
  }, [fetchPrioritizedTasks]);

  return {
    prioritizedTasks,
    recommendations,
    loading,
    error,
    aiPrioritizationEnabled,
    fetchPrioritizedTasks,
    getPrioritySuggestion,
    applyAIPrioritization
  };
}
