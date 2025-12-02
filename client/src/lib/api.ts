// API base URL configuration - uses relative URLs
// All API calls use /api/... which automatically points to the same server
// This works in development, production, Plesk, and any deployment

export const getApiBaseUrl = () => '';
export const getAPI_BASE_URL = () => '';

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  // Always use relative URLs - they automatically work everywhere
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(url, options);
};

export const setApiBaseUrl = (url: string) => {
  console.warn('[API] API base URL is now always relative (/api/...). No manual configuration needed.');
};

export const getStoredApiUrl = () => '';
