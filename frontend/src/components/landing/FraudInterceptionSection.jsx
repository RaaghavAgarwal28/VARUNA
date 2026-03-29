import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Lock, ScanEye, ShieldAlert } from "lucide-react";

export function FraudInterceptionSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const leftY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const rightY = useTransform(scrollYProgress, [0, 1], [-60, 60]);

  return (
    <section id="security" ref={ref} className="landing-light relative overflow-hidden py-[18vh] md:py-[22vh]">
      <div className="grid-light pointer-events-none absolute inset-0 opacity-100" />

      {/* Very subtle orange glow center */}
      <div className="pointer-events-none absolute left-3/4 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF4500]/4 blur-[200px]" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-8">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black/40 shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF4500] shadow-[0_0_8px_#FF4500]" />
          Interception Protocol
        </motion.div>

        {/* Big headline */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2.8rem,7vw,6rem)] font-bold leading-[0.93] tracking-[-0.04em] text-[#111] max-w-5xl"
        >
          Security that lets you
          <br />
          <em className="not-italic text-[#FF4500]">sleep easy.</em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 max-w-2xl text-[1.2rem] leading-[1.55] text-[#555] tracking-[-0.01em]"
        >
          Advanced detection and chain analysis enable real-time intervention across
          accounts — preserving recoverable ₹ before funds exit the banking grid.
        </motion.p>

        {/* Two-column parallax layout */}
        <div className="mt-24 grid gap-16 lg:grid-cols-2 items-start">

          {/* Left: feature list */}
          <motion.div style={{ y: leftY }} className="space-y-5">
            {[
              { label: "Multi-sig Authorization", icon: Lock, desc: "Multi-layered approval protocols before freeze actions execute." },
              { label: "24/7 Threat Monitoring", icon: ScanEye, desc: "Continuous surveillance across all connected bank nodes in real time." },
              { label: "Edge Signal Scoring", icon: ShieldAlert, desc: "On-device anomaly scoring flags behaviorally coordinated accounts before fund dissipation." },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 6 }}
                className="group flex gap-5 rounded-[24px] border border-black/8 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:border-black/15 cursor-default"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#FF4500]/10 border border-[#FF4500]/20">
                  <f.icon size={22} className="text-[#FF4500]" />
                </div>
                <div>
                  <h3 className="font-display text-[1.25rem] font-bold tracking-[-0.02em] text-[#111]">{f.label}</h3>
                  <p className="mt-1.5 text-[0.95rem] leading-[1.55] text-[#666]">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right: Visual mockup card with real VARUNA data */}
          <motion.div style={{ y: rightY }} className="relative">
            <div className="overflow-hidden rounded-[40px] border border-black/10 bg-white p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between border-b border-black/8 pb-6">
                <div className="font-display text-[1.1rem] font-bold tracking-[-0.03em] text-[#111]">
                  Active Trace ID: <span className="text-[#FF4500]">#4892</span>
                </div>
                <span className="rounded-full bg-[#FF4500]/10 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#FF4500]">
                  Live
                </span>
              </div>

              {/* ML Brain Scores — real data representation */}
              <div className="mt-6 space-y-3">
                {[
                  { label: "GAT Structural Match", score: 92, color: "#FF4500" },
                  { label: "LSTM Temporal Signal", score: 78, color: "#111" },
                  { label: "EIF Anomaly Index", score: 64, color: "#111" },
                  { label: "RBI 10-Flag Engine", score: 85, color: "#FF4500" },
                ].map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[0.78rem] font-semibold tracking-[-0.01em] text-[#333]">{m.label}</span>
                      <span className="text-[0.78rem] font-bold" style={{ color: m.color }}>{m.score}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-black/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${m.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ background: m.score > 80 ? "#FF4500" : "#111" }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Fusion formula */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mt-5 rounded-2xl bg-black/[0.03] border border-black/6 px-5 py-4"
              >
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-black/30 mb-2">Cross-Pillar Fusion</div>
                <div className="font-mono text-[0.78rem] text-[#333] leading-relaxed">
                  (GAT×0.35) + (LSTM×0.25) + (EIF×0.20) + (Rules×0.20)
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-[1.3rem] font-display font-bold text-[#FF4500]">87.4</div>
                  <div className="text-[0.72rem] text-black/40 font-semibold">/100 Risk Score</div>
                </div>
              </motion.div>

              {/* Chain steps — with real descriptions */}
              <div className="mt-5 space-y-2.5">
                {[
                  { step: "Detect", desc: "Mule chain pattern identified in 340ms" },
                  { step: "Score", desc: "4-brain ensemble risk: 87.4/100" },
                  { step: "Trace", desc: "3-hop chain across HDFC → SBI → PNB" },
                  { step: "Freeze", desc: "Cross-bank lien initiated, ₹14.2L held" },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 1.0 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 text-[0.7rem] font-bold text-[#FF4500]">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold tracking-[-0.01em] text-[#333]">{item.step}</div>
                      <div className="text-[0.72rem] text-[#888] truncate">{item.desc}</div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-[#FF4500]/40 shrink-0" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating stat badge */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 rounded-[28px] border border-black/8 bg-white p-7 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
            >
              <div className="font-display text-[2.6rem] font-bold leading-none tracking-[-0.04em] text-[#111]">
                98.4<span className="text-[#FF4500]">%</span>
              </div>
              <div className="mt-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-black/40">Recovery Probability</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
