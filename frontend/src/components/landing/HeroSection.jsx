import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, Eye } from "lucide-react";
import { HeroScene } from "./HeroScene";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1.1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="landing-light relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-20"
    >
      {/* Three.js rupee coins WebGL scene */}
      <HeroScene theme="light" />

      {/* Light dot grid */}
      <div className="grid-light pointer-events-none absolute inset-0 opacity-100" />

      {/* Soft vignette edges */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(250,249,246,0.6)_100%)]" />

      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 mx-auto max-w-6xl text-center"
      >
        {/* Pill badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-black/10 bg-white/80 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/50 shadow-sm backdrop-blur-xl"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF4500] animate-pulse" />
          Live Fraud Interception System
        </motion.div>

        {/* Massive headline — exact Framer tracking/sizing */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="font-display text-[clamp(3.5rem,11vw,10rem)] font-bold leading-[0.88] tracking-[-0.04em] text-[#111111]"
        >
          Reimagine
          <br />
          How Banks
          <br />
          <em className="not-italic text-[#FF4500]">Operate.</em>
        </motion.h1>

        {/* Sub-copy */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mx-auto mt-10 max-w-2xl text-[clamp(1.1rem,2vw,1.4rem)] leading-[1.55] tracking-[-0.01em] text-[#555555]"
        >
          VARUNA detects coordinated mule chains, predicts money flow through{" "}
          <strong className="font-semibold text-[#111]">Graph Attention Networks</strong>, and
          enables instant cross-bank freeze operations in real time.
        </motion.p>

        {/* CTAs - exactly Framer's button style */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link to="/dashboard">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 16px 40px rgba(255,69,0,0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-full bg-[#FF4500] px-10 py-4 text-[0.95rem] font-bold tracking-[-0.01em] text-white shadow-[0_8px_24px_rgba(255,69,0,0.35)] transition-all"
            >
              <Zap size={18} />
              Launch Dashboard
            </motion.button>
          </Link>

          <Link to="/dashboard">
            <motion.button
              whileHover={{ scale: 1.04, backgroundColor: "rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-full border border-black/15 bg-white px-10 py-4 text-[0.95rem] font-bold tracking-[-0.01em] text-[#111111] shadow-sm transition-all"
            >
              <Eye size={18} />
              Live Simulation
            </motion.button>
          </Link>
        </motion.div>

        {/* Trust badges - Framer-style inline metadata */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-20 flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111111]/35"
        >
          <span>45 Partner Banks</span>
          <span className="h-[3px] w-[3px] rounded-full bg-black/20" />
          <span>₹ 280Cr+ Recovered</span>
          <span className="h-[3px] w-[3px] rounded-full bg-black/20" />
          <span>RBI 10-Flag Framework</span>
          <span className="h-[3px] w-[3px] rounded-full bg-black/20" />
          <span>Sub-500ms Detection</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
