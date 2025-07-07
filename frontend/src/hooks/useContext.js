/**
 * Custom hook for managing context entries
 */

import { useState, useEffect, useCallback } from 'react';
import apiService, { ApiError } from '../lib/api';

export const useContextEntries = (params = {}) => {
  const [contextEntries, setContextEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContextEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the current value of params rather than depending on it in the dependency array
      const response = await apiService.getContextEntries(params);
      setContextEntries(Array.isArray(response) ? response : response.results || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch context entries');
    } finally {
      setLoading(false);
    }
  }, []);

  const createContextEntry = useCallback(async (entryData) => {
    try {
      const newEntry = await apiService.createContextEntry(entryData);
      setContextEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to create context entry');
    }
  }, []);

  const updateContextEntry = useCallback(async (id, entryData) => {
    try {
      const updatedEntry = await apiService.updateContextEntry(id, entryData);
      setContextEntries(prev => prev.map(entry => 
        entry.id === id ? updatedEntry : entry
      ));
      return updatedEntry;
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to update context entry');
    }
  }, []);

  const deleteContextEntry = useCallback(async (id) => {
    try {
      await apiService.deleteContextEntry(id);
      setContextEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (err) {
      throw err instanceof ApiError ? err : new Error('Failed to delete context entry');
    }
  }, []);

  useEffect(() => {
    // Only fetch on component mount or when params change
    fetchContextEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);
  
  // Return the context entries state and methods

  return {
    contextEntries,
    loading,
    error,
    fetchContextEntries,
    createContextEntry,
    updateContextEntry,
    deleteContextEntry,
    refresh: fetchContextEntries,
  };
};

export default useContextEntries;
