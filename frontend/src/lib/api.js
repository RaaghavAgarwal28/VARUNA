export const DASHBOARD_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/dashboard";

export function getBackendOrigin() {
  try {
    return new URL(DASHBOARD_URL).origin;
  } catch {
    return "http://127.0.0.1:8000";
  }
}

export function getApiBase() {
  return `${getBackendOrigin()}/api`;
}

/**
 * Get the stored JWT token from localStorage.
 * Returns null if no token or token is expired.
 */
export function getStoredToken() {
  return localStorage.getItem("varuna_token") || null;
}

/**
 * Build auth headers for API calls.
 * Falls back to empty object if no token (dev bypass will handle it).
 */
export function getAuthHeaders() {
  const token = getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
