import { motion } from "framer-motion";
import { Brain, Activity, Flag } from "lucide-react";

export function SentinelPanel({ scores, onSelectAccount }) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">VARUNA Sentinel</div>
        <div className="text-sm text-slate-400">
          Real-time ML-powered scoring · VarunaGAT + VarunaLSTM + 10-Flag Engine
        </div>
      </div>
      <div className="space-y-3">
        {scores.slice(0, 8).map((score) => {
          const riskColor = score.risk_score > 70 ? "red" : score.risk_score > 40 ? "orange" : "cyan";
          const flagCount = score.flag_hits?.length ?? 0;

          return (
            <motion.div
              key={score.account_id}
              whileHover={{ scale: 1.01 }}
              onClick={() => onSelectAccount?.(score.account_id)}
              className="cursor-pointer rounded-2xl border border-line/70 bg-white/[0.02] p-4 transition-colors hover:border-cyan/30 hover:bg-white/[0.04]"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{score.account_id}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 truncate max-w-md">
                    {score.indicators?.slice(0, 2).join(" · ") || "—"}
                  </div>
                </div>
                <div className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${
                  riskColor === "red" ? "border-red/30 bg-red/10 text-red" :
                  riskColor === "orange" ? "border-orange/30 bg-orange/10 text-orange" :
                  "border-cyan/30 bg-cyan/10 text-cyan"
                }`}>
                  {score.risk_score}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <MetricMini label="Chain Conf." value={score.chain_confidence} />
                <MetricMini label="Coordination" value={score.human_coordination_score} />
                <MetricMini label="Dissipation" value={score.dissipation_risk} />
                <MetricMini
                  label="GAT"
                  value={`${((score.gat_score || 0) * 100).toFixed(0)}%`}
                  icon={<Brain size={10} className="text-cyan" />}
                />
                <MetricMini
                  label="Flags"
                  value={flagCount > 0 ? `${flagCount} hit${flagCount > 1 ? 's' : ''}` : "—"}
                  icon={<Flag size={10} className={flagCount > 0 ? "text-red" : "text-slate-600"} />}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MetricMini({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-slate-950/30 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-base text-white">{value}</div>
    </div>
  );
}
