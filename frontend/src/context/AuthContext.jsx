/**
 * VARUNA — Authentication Context
 * ===================================
 * Manages JWT tokens, user sessions, and provides
 * authenticated fetch wrapper for all API calls.
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { getApiBase } from "../lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "varuna_token";
const USER_KEY = "varuna_user";

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && !isTokenExpired(saved)) return saved;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Periodically check token expiry
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [token]);

  const login = useCallback(async (username, password) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${getApiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Authentication failed");
      }

      const data = await res.json();
      const userData = {
        username: data.username,
        role: data.role,
        expiresIn: data.expires_in,
      };

      setToken(data.access_token);
      setUser(userData);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setLoginError("");
      return true;
    } catch (err) {
      setLoginError(err.message);
      return false;
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // Try to revoke on server
    if (token) {
      try {
        await fetch(`${getApiBase()}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // silent — we clear locally regardless
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, [token]);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...options.headers };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        // Token expired or revoked — auto-logout
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      return res;
    },
    [token]
  );

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === "admin";
  const isAnalyst = user?.role === "analyst" || isAdmin;

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      isAdmin,
      isAnalyst,
      login,
      logout,
      authFetch,
      loginError,
      loginLoading,
    }),
    [token, user, isAuthenticated, isAdmin, isAnalyst, login, logout, authFetch, loginError, loginLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
