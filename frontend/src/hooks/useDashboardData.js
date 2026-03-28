import { useEffect, useState, useCallback } from "react";
import { DASHBOARD_URL } from "../lib/api";
import { demoData } from "../lib/demoData";

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(DASHBOARD_URL);
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
  }, [refreshKey]);

  return { data, loading, error, refresh };
}
