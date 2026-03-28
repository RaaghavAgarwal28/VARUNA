/**
 * VARUNA — Login Screen
 * ========================
 * Full-screen authentication gate with VARUNA branding,
 * animated security visuals, and a glassmorphism login form.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, Fingerprint, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function LoginScreen() {
  const { login, loginError, loginLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!username.trim() || !password.trim()) return;
      const success = await login(username.trim(), password);
      if (!success) {
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    },
    [username, password, login]
  );

  const quickLogin = useCallback(
    async (user, pass) => {
      setUsername(user);
      setPassword(pass);
      const success = await login(user, pass);
      if (!success) {
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    },
    [login]
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Layered background */}
      <div className="pointer-events-none absolute inset-0 bg-grid grid-overlay opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,69,0,0.10),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,69,0,0.06),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,69,0,0.08),transparent_40%)]" />

      {/* Floating particles effect */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-[#FF4500]/30"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Logo + branding */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#FF4500]/20 bg-[#FF4500]/10 shadow-[0_0_40px_rgba(255,69,0,0.15)]"
          >
            <Shield size={36} className="text-[#FF4500]" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            VARUNA
          </h1>
          <p className="mt-2 text-sm tracking-[0.2em] uppercase text-white/40">
            Secure Command Access
          </p>
        </div>

        {/* Login card */}
        <motion.div
          animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/[0.08] bg-black/80 p-8 shadow-framer-dark backdrop-blur-xl"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF4500]/10">
              <Fingerprint size={18} className="text-[#FF4500]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Authentication Required</div>
              <div className="text-xs text-white/40">Enter your credentials to proceed</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-white/40">
                Username
              </label>
              <div className="group relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 transition group-focus-within:text-[#FF4500]"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#FF4500]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#FF4500]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-white/40">
                Password
              </label>
              <div className="group relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 transition group-focus-within:text-[#FF4500]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#FF4500]/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#FF4500]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/50"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-red/20 bg-red/10 px-4 py-2.5 text-xs text-red"
                >
                  <AlertTriangle size={14} />
                  {loginError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loginLoading || !username.trim() || !password.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#FF4500] transition hover:bg-[#FF4500]/20 hover:border-[#FF4500]/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loginLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Shield size={16} />
                </motion.div>
              ) : (
                <>
                  Authenticate
                  <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo credentials toggle */}
          <div className="mt-6 border-t border-white/[0.04] pt-4">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="flex w-full items-center justify-between text-xs uppercase tracking-[0.16em] text-white/30 transition hover:text-white/50"
            >
              <span>Demo Credentials</span>
              <ChevronRight
                size={12}
                className={`transition ${showCredentials ? "rotate-90" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showCredentials && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  {[
                    { user: "varuna_admin", pass: "DevHouse2026$ecure", role: "Admin", color: "text-red" },
                    { user: "analyst", pass: "Analyst2026$ecure", role: "Analyst", color: "text-orange" },
                    { user: "viewer", pass: "ViewOnly2026", role: "Viewer", color: "text-[#FF4500]" },
                  ].map((cred) => (
                    <button
                      key={cred.user}
                      onClick={() => quickLogin(cred.user, cred.pass)}
                      disabled={loginLoading}
                      className="group flex w-full items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.05] hover:border-white/[0.06] disabled:opacity-40"
                    >
                      <div>
                        <span className="text-xs font-medium text-white/50">{cred.user}</span>
                        <span className={`ml-2 text-[10px] uppercase tracking-wider ${cred.color}`}>
                          {cred.role}
                        </span>
                      </div>
                      <ChevronRight
                        size={12}
                        className="text-white/25 transition group-hover:text-white/50 group-hover:translate-x-0.5"
                      />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Security footer */}
        <div className="mt-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/25">
            256-bit encrypted · JWT HS256 · bcrypt hashed
          </div>
        </div>
      </motion.div>
    </div>
  );
}
