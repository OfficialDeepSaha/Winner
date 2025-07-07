import { API_URL } from '../config/constants';

/**
 * Fetch calendar events with optional filters
 * @param {string} token - Authentication token
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of calendar events
 */
export const fetchCalendarEvents = async (token, filters = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filters.start_date && filters.end_date) {
      // Use the by_date_range endpoint
      const response = await fetch(
        `${API_URL}/calendar-events/by_date_range/?start_date=${filters.start_date}&end_date=${filters.end_date}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching calendar events: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } else {
      // Apply other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value);
          }
        }
      });
      
      const queryString = queryParams.toString();
      const url = queryString ? `${API_URL}/calendar-events/?${queryString}` : `${API_URL}/calendar-events/`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching calendar events: ${response.status}`);
      }
      
      const data = await response.json();
      return data.results || data;
    }
  } catch (error) {
    console.error('Error in fetchCalendarEvents:', error);
    throw error;
  }
};

/**
 * Fetch today's calendar events
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of today's calendar events
 */
export const fetchTodayEvents = async (token) => {
  try {
    const response = await fetch(`${API_URL}/calendar-events/today/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching today's events: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in fetchTodayEvents:', error);
    throw error;
  }
};

/**
 * Fetch upcoming calendar events
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of upcoming calendar events
 */
export const fetchUpcomingEvents = async (token) => {
  try {
    const response = await fetch(`${API_URL}/calendar-events/upcoming/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching upcoming events: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error('Error in fetchUpcomingEvents:', error);
    throw error;
  }
};

/**
 * Create a new calendar event
 * @param {string} token - Authentication token
 * @param {Object} eventData - Calendar event data
 * @returns {Promise<Object>} - Created calendar event
 */
export const createCalendarEvent = async (token, eventData) => {
  try {
    const response = await fetch(`${API_URL}/calendar-events/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error creating calendar event: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in createCalendarEvent:', error);
    throw error;
  }
};

/**
 * Update an existing calendar event
 * @param {string} token - Authentication token
 * @param {string} eventId - Calendar event ID
 * @param {Object} eventData - Updated calendar event data
 * @returns {Promise<Object>} - Updated calendar event
 */
export const updateCalendarEvent = async (token, eventId, eventData) => {
  try {
    const response = await fetch(`${API_URL}/calendar-events/${eventId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error updating calendar event: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in updateCalendarEvent:', error);
    throw error;
  }
};

/**
 * Delete a calendar event
 * @param {string} token - Authentication token
 * @param {string} eventId - Calendar event ID
 * @returns {Promise<void>}
 */
export const deleteCalendarEvent = async (token, eventId) => {
  try {
    const response = await fetch(`${API_URL}/calendar-events/${eventId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting calendar event: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteCalendarEvent:', error);
    throw error;
  }
};

/**
 * Fetch time blocks with optional filters
 * @param {string} token - Authentication token
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - Array of time blocks
 */
export const fetchTimeBlocks = async (token, filters = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filters.date) {
      // Use the by_date endpoint
      const response = await fetch(
        `${API_URL}/time-blocks/by_date/?date=${filters.date}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching time blocks: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } else {
      // Apply other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value);
          }
        }
      });
      
      const queryString = queryParams.toString();
      const url = queryString ? `${API_URL}/time-blocks/?${queryString}` : `${API_URL}/time-blocks/`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching time blocks: ${response.status}`);
      }
      
      const data = await response.json();
      return data.results || data;
    }
  } catch (error) {
    console.error('Error in fetchTimeBlocks:', error);
    throw error;
  }
};

/**
 * Fetch today's time blocks
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of today's time blocks
 */
export const fetchTodayTimeBlocks = async (token) => {
  try {
    const response = await fetch(`${API_URL}/time-blocks/today/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching today's time blocks: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in fetchTodayTimeBlocks:', error);
    throw error;
  }
};

/**
 * Create a new time block
 * @param {string} token - Authentication token
 * @param {Object} timeBlockData - Time block data
 * @returns {Promise<Object>} - Created time block
 */
export const createTimeBlock = async (token, timeBlockData) => {
  try {
    // Ensure we have a valid token using our consistent approach
    if (!token) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      token = userData.token || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
    }
    
    // Log the token to help with debugging (remove in production)
    console.log('Using token for createTimeBlock:', token);
    
    // Try the API endpoint for creating time blocks
    // First attempt with the standard REST endpoint
    let url = `${API_URL}/time-blocks/`;
    
    // Log the request details for debugging
    console.log('Creating time block with data:', timeBlockData);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(timeBlockData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error creating time block: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in createTimeBlock:', error);
    throw error;
  }
};

/**
 * Update an existing time block
 * @param {string} token - Authentication token
 * @param {string} timeBlockId - Time block ID
 * @param {Object} timeBlockData - Updated time block data
 * @returns {Promise<Object>} - Updated time block
 */
export const updateTimeBlock = async (token, timeBlockId, timeBlockData) => {
  try {
    const response = await fetch(`${API_URL}/time-blocks/${timeBlockId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(timeBlockData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error updating time block: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in updateTimeBlock:', error);
    throw error;
  }
};

/**
 * Delete a time block
 * @param {string} token - Authentication token
 * @param {string} timeBlockId - Time block ID
 * @returns {Promise<boolean>}
 */
export const deleteTimeBlock = async (token, timeBlockId) => {
  try {
    const response = await fetch(`${API_URL}/time-blocks/${timeBlockId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting time block: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTimeBlock:', error);
    throw error;
  }
};

/**
 * Start a time block
 * @param {string} token - Authentication token
 * @param {string} timeBlockId - Time block ID
 * @returns {Promise<Object>} - Updated time block
 */
export const startTimeBlock = async (token, timeBlockId) => {
  try {
    const response = await fetch(`${API_URL}/time-blocks/${timeBlockId}/start/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error starting time block: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in startTimeBlock:', error);
    throw error;
  }
};

/**
 * Complete a time block
 * @param {string} token - Authentication token
 * @param {string} timeBlockId - Time block ID
 * @param {boolean} completeTask - Whether to mark the associated task as completed
 * @returns {Promise<Object>} - Updated time block
 */
export const completeTimeBlock = async (token, timeBlockId, completeTask = false) => {
  try {
    const response = await fetch(`${API_URL}/time-blocks/${timeBlockId}/complete/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ complete_task: completeTask }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error completing time block: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in completeTimeBlock:', error);
    throw error;
  }
};
