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
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
};

// Fetch all paged results from an API that uses `page` and `pageSize`
export const fetchAllPaged = async (endpointBase: string, pageSize = 500) => {
  const results: any[] = [];
  let page = 1;
  const maxPages = 1000; // safety cap
  while (page <= maxPages) {
    const sep = endpointBase.includes('?') ? '&' : '?';
    const url = `${endpointBase}${sep}pageSize=${pageSize}&page=${page}`;
    const resp = await apiCall(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
    const js = await resp.json();
    const batch: any[] = js.data || [];
    results.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }
  return results;
};

export const fetchAllVendors = async (minimal = true) => {
  const sep = minimal ? '?minimal=true' : '';
  const resp = await apiCall(`/api/vendors/all${sep}`);
  if (!resp.ok) throw new Error('Failed to fetch all vendors');
  const js = await resp.json();
  return js.data || [];
};

export const setApiBaseUrl = (url: string) => {
  console.warn('[API] API base URL configured via VITE_API_BASE_URL environment variable');
};

export const getStoredApiUrl = () => _getApiBaseUrl();
