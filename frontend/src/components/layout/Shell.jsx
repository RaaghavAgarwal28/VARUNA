import { motion } from "framer-motion";

export function Shell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid grid-overlay opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(125,226,209,0.16),transparent_60%)]" />
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

