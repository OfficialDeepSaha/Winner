/**
 * Application constants
 */

// API URL with fallback to localhost
let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Remove trailing slash if present
// if (apiUrl.endsWith('/')) {
//   apiUrl = apiUrl.slice(0, -1);
// }

export const API_URL = apiUrl;

// Other constants can be added here as needed
