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
