import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HeroScene } from "./HeroScene";

export function FinalCTA() {
  return (
    <section className="landing-dark relative overflow-hidden pt-[18vh] pb-20 md:pt-[22vh]">
      <div className="grid-dark pointer-events-none absolute inset-0 opacity-100" />

      {/* WebGL rupee coins also in the final dark CTA */}
      <HeroScene theme="dark" />

      {/* Center glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-[#FF4500]/7 blur-[200px]" />

      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-6 text-center">

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 backdrop-blur-xl"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF4500] shadow-[0_0_8px_#FF4500] animate-pulse" />
          Production Ready
        </motion.div>

        {/* Giant CTA headline */}
        <motion.h2
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(3.5rem,10vw,9rem)] font-bold leading-[0.88] tracking-[-0.05em] text-white"
        >
          Secure your
          <br />
          network
          <br />
          <em className="not-italic text-[#FF4500]">instantly.</em>
        </motion.h2>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16"
        >
          <Link to="/dashboard">
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 50px rgba(255, 255, 255, 0.12), 0 0 0 1px rgba(255,255,255,0.25) inset",
              }}
              whileTap={{ scale: 0.97 }}
              className="group flex items-center gap-3 rounded-full bg-white px-14 py-5 text-[1rem] font-bold tracking-[-0.01em] text-black shadow-[0_20px_40px_rgba(255,255,255,0.08)] transition-all"
            >
              Get VARUNA Free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </motion.button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="mt-10 text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-white/25"
        >
          Enterprise-ready · No setup fee · Instant access
        </motion.p>
      </div>

      {/* Minimal footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.4 }}
        className="relative z-10 mx-auto mt-40 flex w-full max-w-[1400px] items-center justify-between border-t border-white/[0.07] pt-10 px-6 md:px-8"
      >
        <div className="font-display text-xl font-bold tracking-[-0.04em] text-white">VARUNA</div>
        <div className="flex items-center gap-8 text-[0.85rem] font-semibold tracking-[-0.01em] text-white/30">
          <Link to="/" className="transition hover:text-white">Home</Link>
          <Link to="/dashboard" className="transition hover:text-white">Dashboard</Link>
          <span className="transition hover:text-white cursor-pointer">RBI Docs</span>
          <span className="transition hover:text-white cursor-pointer">Contact</span>
        </div>
      </motion.footer>
    </section>
  );
}
