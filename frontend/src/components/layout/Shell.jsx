import { motion } from "framer-motion";

export function Shell({ children }) {
  return (
    <div className="dashboard-layout relative min-h-screen overflow-hidden">
      {/* Dark grid like the landing page */}
      <div className="grid-dark pointer-events-none absolute inset-0 opacity-100" />
      {/* Orange-red accent glow instead of old cyan */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(255,69,0,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(255,69,0,0.06),transparent_70%)]" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 md:px-6"
      >
        {children}
      </motion.div>
    </div>
  );
}
