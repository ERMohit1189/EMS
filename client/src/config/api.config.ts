/**
 * API Configuration - Uses environment variable VITE_API_BASE_URL
 * 
 * Set VITE_API_BASE_URL in your environment:
 * - Development: http://localhost:5000
 * - Production/Plesk: https://your-domain.com
 * 
 * If VITE_API_BASE_URL is not set, uses relative URLs (/api/...)
 */

const getApiUrl = () => {
  // Try to get from environment variable first
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  // Fallback to relative URLs if no env variable
  return "";
};

export const API_CONFIG = {
  API_URL: getApiUrl(),
};
