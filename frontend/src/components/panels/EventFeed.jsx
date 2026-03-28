import { motion } from "framer-motion";
import { severityTone } from "../../lib/format";

export function EventFeed({ events }) {
  return (
    <div className="panel flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">VARUNA Pulse</div>
          <div className="text-sm text-white/40">Live network event stream</div>
        </div>
        <div className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red">
          Threat High
        </div>
      </div>
      <div className="scrollbar-thin space-y-3 overflow-y-auto pr-2">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{event.title}</div>
                <div className="text-xs tracking-[0.2em] text-white/30">{event.time}</div>
              </div>
              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${severityTone(event.severity)}`}>
                {event.severity}
              </div>
            </div>
            <div className="text-sm text-white/40">{event.amount}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

