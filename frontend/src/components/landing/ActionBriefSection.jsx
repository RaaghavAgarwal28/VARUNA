import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Zap, BrainCircuit, Filter } from "lucide-react";

const cards = [
  {
    icon: Zap,
    title: "Automated Case Briefs",
    desc: "Generate prosecutor-ready documentation, freeze orders, and audit trails instantly.",
    rotate: -4,
    offsetY: 0,
  },
  {
    icon: BrainCircuit,
    title: "Neural Scoring",
    desc: "VarunaGAT assigns real-time fraud probability scores to every account node in the chain.",
    rotate: 2,
    offsetY: 48,
  },
  {
    icon: Filter,
    title: "Predictive Analytics",
    desc: "VarunaLSTM forecasts fund dissipation risk and next-move probability.",
    rotate: -2,
    offsetY: 90,
  },
];

export function ActionBriefSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const perspective = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -10]);

  return (
    <section ref={ref} className="landing-light relative overflow-hidden py-[18vh] md:py-[22vh]">
      <div className="grid-light pointer-events-none absolute inset-0 opacity-100" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-8 text-center">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black/40 shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF4500]" />
          Intelligence Layer
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2.8rem,7vw,6rem)] font-bold leading-[0.93] tracking-[-0.04em] text-[#111]"
        >
          Detect, trace,
          <br />
          and <em className="not-italic text-[#FF4500]">intercept.</em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 max-w-xl text-[1.2rem] leading-[1.55] text-[#555] tracking-[-0.01em]"
        >
          Every case produces a complete intelligence brief — scored, traced, and ready for instant operational response.
        </motion.p>

        {/* 3D Perspective card stack */}
        <motion.div
          style={{ rotateX: perspective, perspective: 1200 }}
          className="mt-24 flex flex-col md:flex-row items-end justify-center gap-0 md:gap-6"
        >
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 120, rotate: 0 }}
              whileInView={{ opacity: 1, y: card.offsetY, rotate: card.rotate }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 1.1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: card.offsetY - 18, rotate: 0, scale: 1.04, zIndex: 10 }}
              className="relative w-full md:w-[340px] overflow-hidden rounded-[32px] border border-black/10 bg-white p-10 text-left shadow-[0_20px_50px_rgba(0,0,0,0.07)] transition-all duration-500 ease-out cursor-default"
            >
              <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#111] text-white">
                <card.icon size={22} />
              </div>
              <h3 className="font-display text-[1.5rem] font-bold tracking-[-0.03em] text-[#111] leading-tight mb-3">
                {card.title}
              </h3>
              <p className="text-[1rem] leading-[1.6] text-[#666]">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Marquee stat bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-24 flex flex-wrap items-center justify-center gap-8 rounded-[24px] border border-black/8 bg-white py-8 px-12 shadow-sm"
        >
          {[
            { v: "₹ 280Cr+", l: "Funds Recovered" },
            { v: "12,000+", l: "Accounts Traced" },
            { v: "45", l: "Banks Networked" },
            { v: "97.6%", l: "Detection Accuracy" },
          ].map((stat) => (
            <div key={stat.l} className="text-center">
              <div className="font-display text-[2rem] font-bold tracking-[-0.04em] text-[#111]">{stat.v}</div>
              <div className="mt-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-black/35">{stat.l}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
