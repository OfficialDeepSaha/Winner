/**
 * Custom hook for AI services
 */

import { useState, useCallback , useEffect } from 'react';
import apiService, { ApiError } from '../lib/api';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add state for AI insights
  const [aiInsights, setAIInsights] = useState(null);

  const analyzeContext = useCallback(async (content, sourceType, contentDate = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.analyzeContext(content, sourceType, contentDate);
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to analyze context';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTaskSuggestions = useCallback(async (taskData, includeContext = true, contextDaysBack = 7) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAITaskSuggestions(taskData, includeContext, contextDaysBack);
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to get task suggestions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const prioritizeTasks = useCallback(async (taskIds, includeContext = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.prioritizeTasks(taskIds, includeContext);
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to prioritize tasks';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getContextInsights = useCallback(async (daysBack = 7, sourceType = null, limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getContextInsights(daysBack, sourceType, limit);
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to get context insights';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkloadAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getWorkloadAnalysis();
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to get workload analysis';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAIStats = useCallback(async (daysBack = 30) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAIStats(daysBack);
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to get AI stats';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAIInsights = useCallback(async (daysBack = 7) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAIInsights(daysBack);
      setAIInsights(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to get AI insights';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    aiInsights,
    analyzeContext,
    getTaskSuggestions,
    prioritizeTasks,
    getContextInsights,
    getWorkloadAnalysis,
    getAIStats,
    getAIInsights,
    clearError,
  };
};

// Custom hook for AI insights specifically for dashboard
export const useAIInsights = (daysBack = 7) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching AI insights with daysBack=${daysBack}`);
      const response = await apiService.getAIInsights(daysBack);
      console.log('AI insights response:', response);
      setInsights(response);
      setLastUpdated(new Date());
      return response;
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to get AI insights';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  // Force refresh function that bypasses any caching
  const forceRefresh = useCallback(async () => {
    console.log('Force refreshing AI insights');
    return fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    loading,
    error,
    lastUpdated,
    refresh: forceRefresh
  };
};

export const useContextAnalysis = () => {
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContexts = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getContextEntries(params);
      setContexts(response.results || response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch contexts');
    } finally {
      setLoading(false);
    }
  }, []);

  const createContext = useCallback(async (contextData) => {
    try {
      const newContext = await apiService.createContextEntry(contextData);
      setContexts(prev => [newContext, ...prev]);
      return newContext;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to create context');
    }
  }, []);

  const analyzeAndCreateContext = useCallback(async (content, sourceType, contentDate = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // First create the context entry
      const contextEntry = await apiService.createContextEntry({
        content,
        source_type: sourceType,
        content_date: contentDate,
      });

      // Then analyze it
      const analysis = await apiService.analyzeContext(content, sourceType, contentDate);
      
      // Update local state
      setContexts(prev => [contextEntry, ...prev]);
      
      return { contextEntry, analysis };
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to analyze and create context';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    contexts,
    loading,
    error,
    fetchContexts,
    createContext,
    analyzeAndCreateContext,
    refresh: fetchContexts,
  };
};

