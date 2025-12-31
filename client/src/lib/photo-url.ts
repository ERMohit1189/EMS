import { getApiBaseUrl } from './api';

/**
 * Helper function to construct full photo URLs
 * Ensures photos are loaded from the correct backend API URL
 */

export const getFullPhotoUrl = (photoPath: string | null | undefined): string => {
  if (!photoPath) return '';

  // If already a full URL, return as is
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }

  // Handle protocol-relative URLs (e.g., //cdn.example.com/path)
  if (photoPath.startsWith('//')) {
    return `${window.location.protocol}${photoPath}`;
  }

  // Normalize api base and photo path to ensure a single slash between them
  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, ''); // remove trailing slash if present
  const normalizedPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;

  const fullUrl = `${apiBaseUrl}${normalizedPath}`;

  // Debug logs for diagnosing photo URL issues
  console.debug('[Photo URL] API Base URL:', apiBaseUrl);
  console.debug('[Photo URL] Photo path:', photoPath);
  console.debug('[Photo URL] Normalized photo path:', normalizedPath);
  console.debug('[Photo URL] Constructed full photo URL:', fullUrl);

  return fullUrl;
};

/**
 * Add cache buster to photo URL to force fresh loads
 */
export const addCacheBuster = (url: string): string => {
  if (!url) return '';

  try {
    const u = new URL(url);
    u.searchParams.set('v', String(Date.now()));
    return u.toString();
  } catch (e) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${Date.now()}`;
  }
};

/**
 * Get photo URL with cache buster applied
 */
export const getPhotoUrlWithCacheBuster = (photoPath: string | null | undefined): string => {
  const fullUrl = getFullPhotoUrl(photoPath);
  return addCacheBuster(fullUrl);
};
