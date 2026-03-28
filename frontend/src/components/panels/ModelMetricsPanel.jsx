import { motion } from "framer-motion";
import { Cpu, Brain, GitBranch, Repeat, BarChart3, Shield } from "lucide-react";

export function ModelMetricsPanel({ metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="panel p-5">
        <div className="panel-heading">ML Model Metrics</div>
        <div className="mt-2 text-sm text-white/40">Models initializing…</div>
      </div>
    );
  }

  const gat = metrics.gat || {};
  const lstm = metrics.lstm || {};
  const eif = metrics.eif || {};
  const cl = metrics.continual_learning || {};
  const tv = metrics.transfer_validation || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel overflow-hidden p-5"
    >
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF4500]/20 bg-[#FF4500]/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#FF4500]">
        <Cpu size={12} /> ML Pipeline Metrics
      </div>
      <div className="mb-5 font-display text-2xl text-white">Model Performance Dashboard</div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* GAT Model */}
        <ModelCard
          icon={<Brain size={16} />}
          title="VarunaGAT"
          subtitle="Graph Attention Network (Elliptic-trained)"
          stats={[
            { label: "Accuracy", value: `${((gat.accuracy || 0) * 100).toFixed(1)}%` },
            { label: "Illicit F1", value: `${((gat.illicit_f1 || 0) * 100).toFixed(1)}%` },
            { label: "Illicit Precision", value: `${((gat.illicit_precision || 0) * 100).toFixed(1)}%` },
            { label: "Illicit Recall", value: `${((gat.illicit_recall || 0) * 100).toFixed(1)}%` },
          ]}
          color="cyan"
        />

        {/* LSTM Model */}
        <ModelCard
          icon={<BarChart3 size={16} />}
          title="VarunaLSTM"
          subtitle="Temporal Coordination Detection"
          stats={[
            { label: "Accuracy", value: `${((lstm.accuracy || 0) * 100).toFixed(1)}%` },
            { label: "Best Accuracy", value: `${((lstm.best_accuracy || 0) * 100).toFixed(1)}%` },
            { label: "Training Samples", value: lstm.n_samples || "—" },
            { label: "Epochs", value: lstm.epochs_trained || "—" },
          ]}
          color="orange"
        />

        {/* EIF Anomaly Detection (from MULE_HUNTER) */}
        <ModelCard
          icon={<Shield size={16} />}
          title="VarunaEIF"
          subtitle="Zero-Day Anomaly Detection (Isolation Forest)"
          stats={[
            { label: "Anomalies Found", value: eif.anomalies_detected || "—" },
            { label: "Anomaly Rate", value: eif.anomaly_rate ? `${(eif.anomaly_rate * 100).toFixed(1)}%` : "—" },
            { label: "Features", value: eif.n_features_expanded ? `${eif.n_features_raw}→${eif.n_features_expanded}` : "—" },
            { label: "Estimators", value: eif.n_estimators || "—" },
          ]}
          color="rose"
        />

        {/* Continual Learning */}
        {cl.elliptic_retention_acc && (
          <ModelCard
            icon={<Repeat size={16} />}
            title="EWC Continual Learning"
            subtitle="Elastic Weight Consolidation"
            stats={[
              { label: "Elliptic Retention", value: `${(cl.elliptic_retention_acc * 100).toFixed(1)}%` },
              { label: "UPI F1 (Mule)", value: `${((cl.upi_f1_mule || 0) * 100).toFixed(1)}%` },
              { label: "EWC Lambda", value: cl.ewc_lambda || "—" },
              { label: "Status", value: "✅ Trained" },
            ]}
            color="accent"
          />
        )}


      </div>
    </motion.div>
  );
}

function ModelCard({ icon, title, subtitle, stats, color }) {
  const colorMap = {
    cyan: "border-[#FF4500]/30",
    accent: "border-[#FF4500]/30",
    orange: "border-orange/30",
    green: "border-[#FF4500]/30",
    purple: "border-purple-400/30",
    rose: "border-rose-400/30",
  };

  return (
    <div className={`rounded-2xl border ${colorMap[color] || "border-white/[0.07]"} bg-white/[0.03] p-4`}>
      <div className="mb-3 flex items-center gap-2 text-sm text-white">
        {icon}
        <div>
          <div className="font-display text-base">{title}</div>
          <div className="text-[10px] text-white/30">{subtitle}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">{s.label}</div>
            <div className="mt-1 font-display text-sm text-white">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
