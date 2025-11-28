// API base URL configuration
// For production: use VITE_API_URL environment variable or this default
const getApiBaseUrl = () => {
  // Check for environment variable (set during build)
  if (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development: use relative URLs (same domain)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  
  // Production: default to relative URLs (change this to your Replit URL)
  // Replace with your actual Replit backend URL
  const apiUrl = window.localStorage.getItem('API_BASE_URL') || '';
  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`;
  return fetch(url, options);
};

export const setApiBaseUrl = (url: string) => {
  window.localStorage.setItem('API_BASE_URL', url);
  window.location.reload();
};
