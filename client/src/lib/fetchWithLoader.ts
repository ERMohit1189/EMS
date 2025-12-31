import { incrementRequests, decrementRequests } from '@/hooks/useLoadingState';

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Try to get JWT token from localStorage
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function fetchWithLoader(url: string, options?: RequestInit): Promise<Response> {
  incrementRequests();
  try {
    // Add JWT token to Authorization header
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options?.headers || {})
      }
    };
    const response = await fetch(url, fetchOptions);
    return response;
  } finally {
    decrementRequests();
  }
}

export async function fetchJsonWithLoader<T>(url: string, options?: RequestInit): Promise<T> {
  incrementRequests();
  try {
    // Add JWT token to Authorization header
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options?.headers || {})
      }
    };
    const response = await fetch(url, fetchOptions);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    decrementRequests();
  }
}

// Helper function for authenticated API calls with JWT token
export async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options?.headers || {})
    }
  };
  return fetch(url, fetchOptions);
}

// Helper function for authenticated JSON API calls with JWT token
export async function authenticatedFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
