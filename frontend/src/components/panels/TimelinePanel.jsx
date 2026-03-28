import { motion } from "framer-motion";

export function TimelinePanel({ timeline }) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">Replayable Scenario Timeline</div>
          <div className="text-sm text-white/40">Compressed 2-minute story arc</div>
        </div>
        <button className="rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#FF4500] transition hover:bg-[#FF4500]/20">
          Replay Case
        </button>
      </div>
      <div className="space-y-3">
        {timeline.map((step, index) => (
          <motion.div
            key={`${step.time}-${step.title}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 text-sm font-semibold text-[#FF4500]">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">{step.title}</div>
              <div className="text-sm text-white/40">{step.time}</div>
            </div>
            <div className="font-display text-sm text-orange">{step.amount}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

