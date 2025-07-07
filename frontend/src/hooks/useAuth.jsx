/**
 * Custom hook for authentication
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import apiService, { ApiError } from '../lib/api';

// Create Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      // Login to get authentication token and user data is stored in localStorage
      const loginResponse = await apiService.login(username, password);
      
      // Get user profile data from token/localStorage
      const profileData = await apiService.getUserProfile();
      
      if (profileData) {
        // Already has token from the login response
        setUser(profileData);
        return profileData;
      } else {
        // If no profile data, create a minimal user object
        const userData = {
          username: username,
          token: loginResponse.token,
          displayName: username
        };
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData));
        return userData;
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiService.logout();
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const profileData = await apiService.getUserProfile();
      
      // If we got valid profile data with at least a username
      if (profileData && profileData.username) {
        setUser(profileData);
        return profileData;
      } else if (profileData && profileData.token) {
        // If we only have a token but missing username
        const basicUserData = {
          ...profileData,
          username: 'user',
          displayName: 'User'
        };
        setUser(basicUserData);
        return basicUserData;
      } else {
        throw new Error('Invalid profile data received');
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // If profile fetch fails but we have a token, keep minimal user data
      const token = localStorage.getItem('authToken');
      if (token) {
        const minimalUser = { token, username: 'user', displayName: 'User' };
        setUser(minimalUser);
        return minimalUser;
      }
      // If no token or other error, clear user data
      setUser(null);
      return null;
    }
  }, []); // Empty dependency array to avoid infinite loops

  useEffect(() => {
    // Auto-login if token exists
    const token = localStorage.getItem('authToken');
    if (token) {
      // Try to get user data from localStorage first for immediate display
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
        } else {
          // Set minimal user with token until profile loads
          setUser({ token });
        }
        
        // Fetch the complete profile data - only call once on mount
        fetchUserProfile();
      } catch (err) {
        console.error('Error loading stored user data:', err);
        // Set minimal user with token as fallback
        setUser({ token });
        fetchUserProfile();
      }
    }
    setLoading(false);
    // fetchUserProfile is stable due to useCallback with empty deps
  }, [fetchUserProfile]);

  // Get token from user object or directly from localStorage to ensure it's always available
  const token = user?.token || localStorage.getItem('authToken') || (
    localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData'))?.token : null
  );

  const value = {
    user,
    token, // Explicitly expose token
    loading,
    error,
    login,
    logout,
    clearError,
    refreshProfile: fetchUserProfile,
    isAuthenticated: !!user || !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Simple hook for components that just need auth state
export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  return { isAuthenticated, loading };
};

