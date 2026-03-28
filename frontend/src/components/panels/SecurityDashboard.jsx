/**
 * VARUNA — Security Dashboard Panel
 * =====================================
 * Displays real-time security metrics, event feed,
 * rate limit status, and encryption details.
 * Requires ADMIN or ANALYST role.
 */
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  KeyRound,
  Activity,
  AlertTriangle,
  Clock,
  Fingerprint,
  Ban,
  CheckCircle,
  XCircle,
  Gauge,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../lib/api";

export function SecurityDashboard() {
  const { authFetch, isAdmin, isAnalyst, user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await authFetch(`${getApiBase()}/auth/security-status`);
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Insufficient permissions" : "Failed to load");
      }
      const data = await res.json();
      setMetrics(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (!isAnalyst) {
    return (
      <div className="panel p-8 text-center">
        <Ban size={40} className="mx-auto mb-3 text-red/60" />
        <div className="font-display text-xl text-white">Access Denied</div>
        <div className="mt-2 text-sm text-slate-400">
          Security Dashboard requires ANALYST or ADMIN role.
          <br />
          Your role: <span className="text-orange">{user?.role}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel flex items-center justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Shield size={28} className="text-cyan/60" />
        </motion.div>
        <span className="ml-3 text-slate-400">Loading security metrics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-orange" />
        <div className="font-display text-lg text-white">Security Feed Unavailable</div>
        <div className="mt-2 text-sm text-slate-400">{error}</div>
      </div>
    );
  }

  const posture = metrics?.security_posture || "NORMAL";
  const isElevated = posture === "ELEVATED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
          <Shield size={14} />
          Security Command
        </div>
        <div className="font-display text-3xl text-white">Security Operations Dashboard</div>
        <div className="mt-3 max-w-3xl text-slate-300">
          Real-time security posture monitoring, authentication events, rate limiting status,
          and cryptographic audit trail for VARUNA API infrastructure.
        </div>
      </div>

      {/* Posture + Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {/* Security Posture */}
        <motion.div
          className={`rounded-3xl border p-5 ${
            isElevated
              ? "border-red/30 bg-red/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
          animate={isElevated ? { opacity: [1, 0.7, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            {isElevated ? <ShieldAlert size={14} className="text-red" /> : <ShieldCheck size={14} className="text-emerald-400" />}
            Security Posture
          </div>
          <div className={`font-display text-2xl ${isElevated ? "text-red" : "text-emerald-400"}`}>
            {posture}
          </div>
        </motion.div>

        <SecurityMetricCard
          icon={CheckCircle}
          label="Logins (1h)"
          value={metrics?.successful_logins_1h ?? 0}
          tone="cyan"
        />
        <SecurityMetricCard
          icon={XCircle}
          label="Auth Failures (1h)"
          value={metrics?.auth_failures_1h ?? 0}
          tone={metrics?.auth_failures_1h > 3 ? "red" : "orange"}
        />
        <SecurityMetricCard
          icon={KeyRound}
          label="Revoked Tokens"
          value={metrics?.revoked_tokens ?? 0}
          tone="orange"
        />
        <SecurityMetricCard
          icon={Users}
          label="Active Users"
          value={metrics?.active_users ?? 0}
          tone="cyan"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Security Events Feed */}
        <div className="panel p-6">
          <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Activity size={14} className="text-cyan" />
            Latest Security Events
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            <AnimatePresence>
              {(metrics?.latest_events || []).slice().reverse().map((event, i) => (
                <motion.div
                  key={event.event_hash || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-line/40 bg-white/[0.02] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <EventIcon type={event.event_type} severity={event.severity} />
                      <div>
                        <div className="text-xs font-medium text-white">
                          {formatEventType(event.event_type)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {event.username} · {event.ip_address}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <SeverityBadge severity={event.severity} />
                      <div className="mt-1 text-[10px] text-slate-600">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  </div>
                  {event.details && (
                    <div className="mt-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-[11px] font-mono text-slate-400">
                      {event.details}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {(!metrics?.latest_events || metrics.latest_events.length === 0) && (
              <div className="py-8 text-center text-sm text-slate-500">
                No security events recorded
              </div>
            )}
          </div>
        </div>

        {/* Right column: Encryption + Rate Limits */}
        <div className="space-y-6">
          {/* Encryption Details */}
          <div className="panel p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Lock size={14} className="text-cyan" />
              Encryption & Cryptography
            </div>
            <div className="space-y-3">
              {[
                {
                  label: "JWT Algorithm",
                  value: metrics?.encryption?.jwt_algorithm || "HS256",
                  icon: Fingerprint,
                },
                {
                  label: "Password Hashing",
                  value: metrics?.encryption?.password_hashing || "bcrypt",
                  icon: Lock,
                },
                {
                  label: "Audit Hashing",
                  value: metrics?.encryption?.audit_hashing || "SHA-256",
                  icon: Shield,
                },
                {
                  label: "Token Expiry",
                  value: `${metrics?.encryption?.token_expiry_minutes || 60} min`,
                  icon: Clock,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-line/30 bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                  <span className="text-xs font-medium font-mono text-cyan">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Limits */}
          <div className="panel p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Gauge size={14} className="text-orange" />
              Rate Limit Status
            </div>
            {metrics?.rate_limits && Object.keys(metrics.rate_limits).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(metrics.rate_limits).map(([ip, info]) => (
                  <div
                    key={ip}
                    className="rounded-xl border border-line/30 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-300">{ip}</span>
                      <span
                        className={`text-xs font-medium ${
                          info.remaining < 20 ? "text-red" : "text-emerald-400"
                        }`}
                      >
                        {info.remaining}/{info.max_requests}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          info.remaining < 20 ? "bg-red/60" : "bg-cyan/40"
                        }`}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${((info.max_requests - info.remaining) / info.max_requests) * 100}%`,
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-600">
                      {info.requests_in_window} requests in {info.window_seconds}s window
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">
                No active rate-limited IPs
              </div>
            )}
          </div>

          {/* Total Events Counter */}
          <div className="panel p-6">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Activity size={14} className="text-cyan" />
              Audit Summary
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line/30 bg-white/[0.02] p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Events</div>
                <div className="mt-1 font-display text-2xl text-white">{metrics?.total_events ?? 0}</div>
              </div>
              <div className="rounded-xl border border-line/30 bg-white/[0.02] p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Recent (1h)</div>
                <div className="mt-1 font-display text-2xl text-cyan">{metrics?.recent_events_1h ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function SecurityMetricCard({ icon: Icon, label, value, tone }) {
  const tones = {
    red: "border-red/20 text-red",
    orange: "border-orange/20 text-orange",
    cyan: "border-cyan/20 text-cyan",
  };

  return (
    <div className={`rounded-3xl border bg-white/[0.02] p-5 ${tones[tone] || tones.cyan}`}>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
        <Icon size={14} />
        {label}
      </div>
      <div className="font-display text-2xl text-white">{value}</div>
    </div>
  );
}

function EventIcon({ type, severity }) {
  const isWarning = severity === "WARNING";
  if (type.includes("FAILURE") || type.includes("DENIED")) {
    return <XCircle size={14} className="text-red flex-shrink-0" />;
  }
  if (type.includes("SUCCESS") || type === "API_KEY_AUTH") {
    return <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />;
  }
  if (type === "RATE_LIMIT_EXCEEDED") {
    return <AlertTriangle size={14} className="text-orange flex-shrink-0" />;
  }
  if (isWarning) {
    return <AlertTriangle size={14} className="text-orange flex-shrink-0" />;
  }
  return <Activity size={14} className="text-cyan flex-shrink-0" />;
}

function SeverityBadge({ severity }) {
  const styles = {
    WARNING: "border-orange/20 bg-orange/10 text-orange",
    INFO: "border-cyan/20 bg-cyan/10 text-cyan",
    ERROR: "border-red/20 bg-red/10 text-red",
  };

  return (
    <span
      className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
        styles[severity] || styles.INFO
      }`}
    >
      {severity}
    </span>
  );
}

function formatEventType(type) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
}
