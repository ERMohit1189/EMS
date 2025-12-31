/**
 * API Configuration
 *
 * Set the frontend API base URL with environment variable `VITE_API_URL`.
 * Production: https://eomsservices.jtstechnology.in
 * Development: https://localhost:56184 (default)
 *
 * IMPORTANT: Frontend runs on https://eoms.jtstechnology.in and API runs on https://eomsservices.jtstechnology.in
 * CORS is configured to allow both HTTP and HTTPS with credentials.
 */

//const apiUrl = "https://eomsservices.jtstechnology.in";
const apiUrl = "http://localhost:5199";
export const API_CONFIG = {
  // Use VITE_API_URL (if set) otherwise default to .NET API running in Visual Studio
  // NOTE: No trailing slash - endpoints will add their own leading slash
  API_URL: apiUrl,
};
