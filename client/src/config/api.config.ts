/**
 * API Configuration
 *
 * Set the frontend API base URL with environment variable `VITE_API_URL`.
 * Defaults to .NET ASP.NET Core API at https://localhost:56184 when not provided.
 *
 * IMPORTANT: Frontend runs on http://localhost:7000 and API runs on https://localhost:56184
 * CORS is configured to allow both HTTP and HTTPS with credentials.
 */

export const API_CONFIG = {
  // Use VITE_API_URL (if set) otherwise default to .NET API running in Visual Studio
  // NOTE: No trailing slash - endpoints will add their own leading slash
  API_URL: import.meta.env.VITE_API_URL || "https://localhost:56184",
};
