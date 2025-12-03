/**
 * API Configuration - Local Development with Neon Cloud Database
 *
 * Frontend: http://localhost:5173 (Vite Dev Server)
 * Backend: http://localhost:8888 (Express Server)
 * Database: Neon Cloud (PostgreSQL)
 */

export const API_CONFIG = {
  // Use your local backend server
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:8888",
};
