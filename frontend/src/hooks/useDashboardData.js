import { useEffect, useState, useCallback } from "react";
import { DASHBOARD_URL } from "../lib/api";
import { demoData } from "../lib/demoData";
import { useAuth } from "../context/AuthContext";

export function useDashboardData() {
  const { authFetch, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;

    async function load() {
      try {
        const response = await authFetch(DASHBOARD_URL);
        if (!response.ok) {
          throw new Error("Dashboard feed unavailable");
        }
        const payload = await response.json();
        if (active) {
          setData(payload);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setData(structuredClone(demoData));
          setError("");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [refreshKey, authFetch, isAuthenticated]);

  return { data, loading, error, refresh };
}
