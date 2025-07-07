/**
 * Custom hook for task management
 */

import { useState, useEffect, useCallback } from 'react';
import apiService, { ApiError } from '../lib/api';

export const useTasks = (initialFilters = {}) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    page: 1,
  });

  const fetchTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getTasks({ ...filters, ...params });
      setTasks(response.results || response);
      
      if (response.count !== undefined) {
        setPagination({
          count: response.count,
          next: response.next,
          previous: response.previous,
          page: params.page || 1,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createTask = useCallback(async (taskData) => {
    try {
      const newTask = await apiService.createTask(taskData);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to create task');
    }
  }, []);

  const updateTask = useCallback(async (id, taskData) => {
    try {
      const updatedTask = await apiService.updateTask(id, taskData);
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      return updatedTask;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to update task');
    }
  }, []);

  const deleteTask = useCallback(async (id) => {
    try {
      await apiService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to delete task');
    }
  }, []);

  const markComplete = useCallback(async (id) => {
    try {
      const updatedTask = await apiService.markTaskComplete(id);
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      return updatedTask;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to mark task complete');
    }
  }, []);

  const markInProgress = useCallback(async (id) => {
    try {
      const updatedTask = await apiService.markTaskInProgress(id);
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      return updatedTask;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to mark task in progress');
    }
  }, []);

  const bulkUpdate = useCallback(async (taskIds, updates) => {
    try {
      await apiService.bulkUpdateTasks(taskIds, updates);
      // Refresh tasks after bulk update
      await fetchTasks();
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to bulk update tasks');
    }
  }, [fetchTasks]);

  const bulkDelete = useCallback(async (taskIds) => {
    try {
      await apiService.bulkDeleteTasks(taskIds);
      setTasks(prev => prev.filter(task => !taskIds.includes(task.id)));
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to bulk delete tasks');
    }
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    filters,
    pagination,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    markComplete,
    markInProgress,
    bulkUpdate,
    bulkDelete,
    updateFilters,
    clearFilters,
    refresh: fetchTasks,
  };
};

export const useTaskStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getTaskStats();
      setStats(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
};

export const useTaskCompletionTrend = (days = 7) => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrendData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getTaskCompletionTrend(days);
      setTrendData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch task completion trend');
      // Provide empty data on error
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrendData();
  }, [fetchTrendData]);

  return {
    trendData,
    loading,
    error,
    refresh: fetchTrendData,
  };
};

export const useProductivityTrend = (weeks = 4) => {
  const [productivityData, setProductivityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProductivityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getProductivityTrend(weeks);
      setProductivityData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch productivity trend');
      // Provide empty data on error
      setProductivityData([]);
    } finally {
      setLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    fetchProductivityData();
  }, [fetchProductivityData]);

  return {
    productivityData,
    loading,
    error,
    refresh: fetchProductivityData,
  };
};

export const useWorkloadAnalysis = () => {
  const [workloadData, setWorkloadData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkloadAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getWorkloadAnalysis();
      setWorkloadData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch workload analysis');
      setWorkloadData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkloadAnalysis();
  }, [fetchWorkloadAnalysis]);

  return {
    workloadData,
    loading,
    error,
    refresh: fetchWorkloadAnalysis,
  };
};

export const useAIStats = (timeRange = 30) => {
  const [aiStats, setAIStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAIStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAIStats(timeRange);
      setAIStats(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch AI stats');
      setAIStats(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAIStats();
  }, [fetchAIStats]);

  return {
    aiStats,
    loading,
    error,
    refresh: fetchAIStats,
  };
};

export const useContextInsights = (timeRange = 30) => {
  const [contextInsights, setContextInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContextInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getContextInsights(timeRange);
      setContextInsights(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch context insights');
      setContextInsights(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchContextInsights();
  }, [fetchContextInsights]);

  return {
    contextInsights,
    loading,
    error,
    refresh: fetchContextInsights,
  };
};

export const useDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getDashboardData();
      setDashboardData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboardData,
    loading,
    error,
    refresh: fetchDashboard,
  };
};

