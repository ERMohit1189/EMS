import { incrementRequests, decrementRequests } from '@/hooks/useLoadingState';

export async function fetchWithLoader(url: string, options?: RequestInit): Promise<Response> {
  incrementRequests();
  try {
    const response = await fetch(url, options);
    return response;
  } finally {
    decrementRequests();
  }
}

export async function fetchJsonWithLoader<T>(url: string, options?: RequestInit): Promise<T> {
  incrementRequests();
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    decrementRequests();
  }
}
