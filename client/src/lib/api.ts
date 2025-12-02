// API base URL configuration from environment or relative URLs
import { API_CONFIG } from '../config/api.config';

const _getApiBaseUrl = () => {
  return API_CONFIG.API_URL;
};

export const getApiBaseUrl = () => _getApiBaseUrl();
export const getAPI_BASE_URL = () => _getApiBaseUrl();

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const baseUrl = _getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${endpoint}` : (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  return fetch(url, options);
};

export const setApiBaseUrl = (url: string) => {
  console.warn('[API] API base URL configured via VITE_API_BASE_URL environment variable');
};

export const getStoredApiUrl = () => _getApiBaseUrl();
