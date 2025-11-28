// API base URL configuration - runtime configurable
let apiBaseUrl = '';

const getApiBaseUrl = () => {
  // First check localStorage (user-set configuration)
  const stored = window.localStorage.getItem('API_BASE_URL');
  if (stored) return stored;
  
  // Check for environment variable (set during build)
  if (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development: use relative URLs (same domain)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  
  // Production on different domain: return empty (will need to be configured)
  return '';
};

export const getAPI_BASE_URL = () => getApiBaseUrl();

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${getApiBaseUrl()}${endpoint}`;
  return fetch(url, options);
};

export const setApiBaseUrl = (url: string) => {
  if (!url.startsWith('http')) {
    throw new Error('API URL must start with http:// or https://');
  }
  window.localStorage.setItem('API_BASE_URL', url);
  window.location.reload();
};

export const getStoredApiUrl = () => window.localStorage.getItem('API_BASE_URL');
