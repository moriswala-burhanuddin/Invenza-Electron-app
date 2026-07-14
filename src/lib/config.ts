// API Configuration
// This file provides the base URL for API calls based on the environment

// Helper to check if we're in development mode
export const isDevelopment = import.meta.env.DEV;

// Read from environment variable, fallback to production
const API_BASE_URL = import.meta.env.VITE_API_URL || (isDevelopment ? 'http://127.0.0.1:8000' : 'https://invenza-erp.cloud');

// API version
const API_VERSION = 'v1';

// Full API URL
export const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Export base URL for custom endpoints
export const BASE_URL = API_BASE_URL;

// Log current configuration in development
if (isDevelopment) {
    console.log('API Configuration:', {
        baseUrl: API_BASE_URL,
        apiUrl: API_URL,
        mode: import.meta.env.MODE
    });
}
