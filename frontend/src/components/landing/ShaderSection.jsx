import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ShaderAnimation } from "../ui/ShaderAnimation";

export function ShaderSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Full-bleed shader fills the whole section */}
      <ShaderAnimation className="absolute inset-0 w-full h-full" />

      {/* Dark gradient overlays: top + bottom fades for seamless transitions */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      {/* Centered content overlay */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">

        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/50 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF4500] shadow-[0_0_10px_#FF4500] animate-pulse" />
          Neural Signal Processing
        </motion.div>

        {/* Headline displayed over shader */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(3rem,9vw,8.5rem)] font-bold leading-[0.9] tracking-[-0.05em] text-white"
          style={{ textShadow: "0 0 80px rgba(255,69,0,0.35)" }}
        >
          Every signal.
          <br />
          <em className="not-italic text-[#FF4500]">Analyzed.</em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-10 max-w-lg text-[1.15rem] leading-[1.6] text-white/55 tracking-[-0.01em]"
        >
          VARUNA's neural scoring layer processes transaction wave patterns,
          flagging coordinated mule activity before funds leave the system.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12"
        >
          <Link to="/dashboard">
            <motion.button
              whileHover={{
                scale: 1.06,
                boxShadow: "0 20px 50px rgba(255,69,0,0.55)",
                backgroundColor: "#e03d00",
              }}
              whileTap={{ scale: 0.96 }}
              className="group flex items-center gap-3 rounded-full bg-[#FF4500] px-12 py-4 text-[0.95rem] font-bold tracking-[-0.01em] text-white shadow-[0_12px_32px_rgba(255,69,0,0.4)] transition-all"
            >
              View Live Analysis
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
