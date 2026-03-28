import { motion } from "framer-motion";
import { Siren, Brain, ShieldCheck, Timer } from "lucide-react";

const features = [
  {
    icon: Siren,
    title: "Real-Time Alerts",
    description: "Instant detection and escalation the moment suspicious coordinated transfers begin.",
  },
  {
    icon: Brain,
    title: "VarunaGAT Intelligence",
    description: "Graph Attention Networks score every account's fraud probability across the chain.",
  },
  {
    icon: ShieldCheck,
    title: "Instant Cross-Bank Freeze",
    description: "One-click multi-bank freeze operations, preserving recoverable ₹ before dissipation.",
  },
  {
    icon: Timer,
    title: "Sub-500ms Operations",
    description: "VARUNA's detection pipeline identifies and responds within critical time windows.",
  },
];

export function FeatureCards() {
  return (
    <section
      id="features"
      className="landing-dark relative overflow-hidden px-6 py-[18vh] md:py-[22vh]"
    >
      {/* Dark grid */}
      <div className="grid-dark pointer-events-none absolute inset-0 opacity-100" />

      {/* Orange glow behind 2nd card */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full bg-[#FF4500]/5 blur-[160px]" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 md:px-8">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 backdrop-blur-xl"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF4500] shadow-[0_0_8px_#FF4500]" />
          Core Pipeline
        </motion.div>

        {/* Main headline */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2.8rem,7vw,6rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white max-w-4xl"
        >
          VARUNA is a real-time
          <br />
          <span className="text-[#FF4500]">cross-bank</span> fraud
          <br />
          interception system.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl text-[1.2rem] leading-[1.55] tracking-[-0.01em] text-white/50"
        >
          Track the flow. Reveal the chain. Intercept instantly.
        </motion.p>

        {/* 2×2 card grid */}
        <div className="mt-20 grid gap-5 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 1, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.015 }}
              className="group relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-white/[0.03] p-10 md:p-12 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.14] hover:bg-white/[0.06]"
            >
              {/* Icon */}
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/50">
                <f.icon size={26} className="text-white" style={{ filter: "drop-shadow(0 0 10px rgba(255,69,0,0.6))" }} />
              </div>

              <h3 className="font-display text-[1.9rem] font-bold tracking-[-0.03em] text-white leading-tight mb-3">
                {f.title}
              </h3>
              <p className="text-[1.05rem] leading-[1.6] text-white/45">{f.description}</p>

              {/* Hover glow */}
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-[300px] w-[300px] rounded-full bg-[#FF4500] opacity-0 blur-[100px] mix-blend-screen transition-opacity duration-700 group-hover:opacity-[0.08]" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
