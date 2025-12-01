// API base URL configuration - uses config file
import { API_CONFIG } from '../config/api.config';

const _getApiBaseUrlInternal = () => {
  // Use API configuration from config file
  // Edit client/src/config/api.config.ts to change the API URL
  return API_CONFIG.API_URL;
};

export const getApiBaseUrl = () => _getApiBaseUrlInternal();
export const getAPI_BASE_URL = () => _getApiBaseUrlInternal();

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${_getApiBaseUrlInternal()}${endpoint}`;
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
