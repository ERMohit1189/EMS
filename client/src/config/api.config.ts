/**
 * API Configuration - Local Development with Neon Cloud Database
 *
 * Frontend & Backend: http://localhost:7000 (Both served from Express)
 * Database: Neon Cloud (PostgreSQL)
 */

export const API_CONFIG = {
  // Use your local backend server (same port as frontend)
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:7000",
};
