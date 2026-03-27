import { motion } from "framer-motion";
import { Shield, AlertTriangle, Activity, Cpu, Brain, Zap } from "lucide-react";

const FLAG_META = {
  F1: { name: "Zero-Washout", icon: "💸", color: "text-red" },
  F2: { name: "Dormant Spike", icon: "💤", color: "text-orange" },
  F3: { name: "Micro-Credits", icon: "🔢", color: "text-orange" },
  F4: { name: "Income Mismatch", icon: "📊", color: "text-yellow-400" },
  F5: { name: "Cross-Bank Chain", icon: "🏦", color: "text-red" },
  F6: { name: "Device Cluster", icon: "📱", color: "text-orange" },
  F7: { name: "High-Risk Mobile", icon: "📡", color: "text-yellow-400" },
  F8: { name: "Geo-Anomaly", icon: "🗺️", color: "text-yellow-400" },
  F9: { name: "Rapid Opening", icon: "⚡", color: "text-orange" },
  F10: { name: "Round-Trip", icon: "🔄", color: "text-red" },
};

export function NodeDetailPanel({ node, score, onClose }) {
  if (!node) return null;

  const gatScore = score?.gat_score ?? 0;
  const lstmScore = score?.lstm_score ?? 0;
  const flagHits = score?.flag_hits ?? [];
  const indicators = score?.indicators ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="panel overflow-hidden p-5"
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
            <Shield size={12} /> Account Investigation
          </div>
          <div className="font-display text-2xl text-white">{node.id}</div>
          <div className="mt-1 text-sm text-slate-400">
            {node.bank} · {node.node_type} · {node.status}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        )}
      </div>

      {/* ML Score Cards */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <ScoreCard
          icon={<Brain size={14} />}
          label="GAT Score"
          value={`${(gatScore * 100).toFixed(1)}%`}
          color={gatScore > 0.7 ? "red" : gatScore > 0.4 ? "orange" : "cyan"}
          sublabel="Graph topology"
        />
        <ScoreCard
          icon={<Activity size={14} />}
          label="LSTM Score"
          value={`${(lstmScore * 100).toFixed(1)}%`}
          color={lstmScore > 0.7 ? "red" : lstmScore > 0.4 ? "orange" : "cyan"}
          sublabel="Temporal burst"
        />
        <ScoreCard
          icon={<AlertTriangle size={14} />}
          label="Risk Score"
          value={`${score?.risk_score?.toFixed(1) ?? 0}`}
          color={score?.risk_score > 70 ? "red" : score?.risk_score > 40 ? "orange" : "cyan"}
          sublabel="Combined"
        />
      </div>

      {/* F1-F10 Flag Grid */}
      <div className="mb-5">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          RBI Mule Detection Flags (F1–F10)
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(FLAG_META).map(([flagId, meta]) => {
            const isHit = flagHits.includes(flagId);
            return (
              <motion.div
                key={flagId}
                animate={isHit ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isHit ? Infinity : 0, repeatDelay: 2 }}
                className={`rounded-xl border px-2 py-2 text-center text-xs ${
                  isHit
                    ? "border-red/40 bg-red/15 text-red shadow-lg shadow-red/10"
                    : "border-line/50 bg-white/[0.02] text-slate-600"
                }`}
                title={meta.name}
              >
                <div className="text-lg">{meta.icon}</div>
                <div className="mt-1 font-mono text-[10px]">{flagId}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="mb-4">
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Risk Indicators
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {indicators.map((ind, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-line/50 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
              <Zap size={10} className="mt-0.5 shrink-0 text-orange" />
              {ind}
            </div>
          ))}
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-2">
        <Row label="Balance" value={`₹${node.balance?.toLocaleString?.() ?? 0}`} />
        <Row label="Chain Confidence" value={`${score?.chain_confidence?.toFixed(1) ?? 0}%`} />
        <Row label="Coordination" value={`${score?.human_coordination_score?.toFixed(1) ?? 0}%`} />
        <Row label="Dissipation Risk" value={`${score?.dissipation_risk?.toFixed(1) ?? 0}%`} />
      </div>
    </motion.div>
  );
}

function ScoreCard({ icon, label, value, color, sublabel }) {
  const colors = {
    red: "border-red/30 bg-red/10 text-red",
    orange: "border-orange/30 bg-orange/10 text-orange",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  };

  return (
    <div className={`rounded-2xl border p-3 ${colors[color]}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]">
        {icon} {label}
      </div>
      <div className="font-display text-xl text-white">{value}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">{sublabel}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line/70 bg-white/[0.02] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="text-right text-sm text-white">{value}</div>
    </div>
  );
}
