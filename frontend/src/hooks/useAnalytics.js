/**
 * Custom hooks for analytics functionality
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../lib/api';

/**
 * Hook to fetch task statistics
 */
export const useTaskStats = (timeRange = 30) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getTaskStats();
        setStats(response);
      } catch (err) {
        setError(err.message || 'Failed to fetch task statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  return { stats, loading, error };
};

/**
 * Hook to fetch task completion trend data
 */
export const useTaskCompletionTrend = (days = 7) => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getTaskCompletionTrend(days);
        setTrendData(response);
      } catch (err) {
        setError(err.message || 'Failed to fetch task completion trend data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [days]);

  return { trendData, loading, error };
};

/**
 * Hook to fetch productivity trend data
 */
export const useProductivityTrend = (weeks = 4) => {
  const [productivityData, setProductivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductivityData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getProductivityTrend(weeks);
        setProductivityData(response);
      } catch (err) {
        setError(err.message || 'Failed to fetch productivity trend data');
      } finally {
        setLoading(false);
      }
    };

    fetchProductivityData();
  }, [weeks]);

  return { productivityData, loading, error };
};

/**
 * Hook to fetch workload analysis data
 */
export const useWorkloadAnalysis = () => {
  const [workloadData, setWorkloadData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getWorkloadAnalysis();
      setWorkloadData(response);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to fetch workload analysis');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(err => console.error('Error in initial workload analysis fetch:', err));
  }, [refresh]);

  return { workloadData, loading, error, refresh };
};

/**
 * Hook to fetch AI statistics
 */
export const useAIStats = (timeRange = 30) => {
  const [aiStats, setAIStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAIStats(timeRange);
      setAIStats(response);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to fetch AI statistics');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    refresh().catch(err => console.error('Error in initial AI stats fetch:', err));
  }, [refresh]);

  return { aiStats, loading, error, refresh };
};

/**
 * Hook to fetch context insights
 * @param {number} initialTimeRange - Initial time range in days
 */
export const useContextInsights = (initialTimeRange = 30) => {
  const [contextInsights, setContextInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async (customTimeRange = null) => {
    setLoading(true);
    setError(null);
    
    // Use custom time range if provided, otherwise use the state value
    const daysBack = customTimeRange !== null ? customTimeRange : timeRange;
    
    try {
      const response = await apiService.getContextInsights(daysBack);
      setContextInsights(response);
      setLastUpdated(new Date());
      return response;
    } catch (err) {
      setError(err.message || 'Failed to fetch context insights');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Function to change time range and refresh data
  const changeTimeRange = useCallback((newTimeRange) => {
    setTimeRange(newTimeRange);
    refresh(newTimeRange).catch(err => 
      console.error('Error fetching context insights with new time range:', err)
    );
  }, [refresh]);

  // Initial data fetch
  useEffect(() => {
    refresh().catch(err => console.error('Error in initial context insights fetch:', err));
  }, [refresh]);

  return { 
    contextInsights, 
    loading, 
    error, 
    refresh, 
    timeRange,
    changeTimeRange,
    lastUpdated 
  };
};
