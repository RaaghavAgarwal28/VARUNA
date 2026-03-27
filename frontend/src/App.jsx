import { AnimatePresence, motion } from "framer-motion";
import { useState, useCallback } from "react";
import { AlertTriangle, ShieldCheck, Sparkles, TimerReset, Siren, Brain } from "lucide-react";
import { Shell } from "./components/layout/Shell";
import { ThreatGraph } from "./components/graph/ThreatGraph";
import { BriefPanel } from "./components/panels/BriefPanel";
import { BanksSection } from "./components/panels/BanksSection";
import { EventFeed } from "./components/panels/EventFeed";
import { India3DModelPanel } from "./components/panels/India3DModelPanel";
import { InterceptPanel } from "./components/panels/InterceptPanel";
import { MetricCard } from "./components/panels/MetricCard";
import { ModelMetricsPanel } from "./components/panels/ModelMetricsPanel";
import { NodeDetailPanel } from "./components/panels/NodeDetailPanel";
import { SentinelPanel } from "./components/panels/SentinelPanel";
import { StatesSection } from "./components/panels/StatesSection";
import { TimelinePanel } from "./components/panels/TimelinePanel";
import { useDashboardData } from "./hooks/useDashboardData";
import { buildBankIntel, buildStateIntel } from "./lib/bankIntel";
import { formatCurrency, formatSeconds } from "./lib/format";
import { getApiBase } from "./lib/api";

export default function App() {
  const { data, loading, error, refresh } = useDashboardData();
  const [activeDashboard, setActiveDashboard] = useState("command");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [injecting, setInjecting] = useState(false);

  const handleInjectFraud = useCallback(async () => {
    setInjecting(true);
    try {
      const res = await fetch(`${getApiBase()}/inject-fraud`, { method: "POST" });
      if (res.ok) {
        setTimeout(() => refresh?.(), 500);
      }
    } catch {
      // silent fail
    } finally {
      setTimeout(() => setInjecting(false), 2000);
    }
  }, [refresh]);

  const handleSelectAccount = useCallback((accountId) => {
    setSelectedNodeId(accountId);
  }, []);

  if (loading) {
    return (
      <Shell>
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="panel max-w-xl p-10 text-center">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="font-display text-3xl text-white"
            >
              Initializing VARUNA
            </motion.div>
            <div className="mt-3 text-slate-400">
              Loading ML models, scoring dissipation risk, staging freeze pathways…
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="panel p-8">
          <div className="font-display text-2xl text-red">Dashboard feed unavailable</div>
          <div className="mt-2 text-slate-400">{error || "Backend is not responding."}</div>
        </div>
      </Shell>
    );
  }

  const overview = data.national_overview;
  const activeCase = data.cases[0];
  const bankIntel = buildBankIntel(data.graph, data.event_feed);
  const stateIntel = buildStateIntel(bankIntel);
  const scoreByAccount = Object.fromEntries(
    (data.sentinel_scores || []).map((s) => [s.account_id, s])
  );
  const selectedNode = selectedNodeId
    ? data.graph.nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <Shell>
      <header className="mb-6 flex flex-col gap-6 rounded-[32px] border border-line/70 bg-black/20 p-6 backdrop-blur-xl xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan">
            <Sparkles size={14} />
            National Fraud Interception Command Center
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
            VARUNA
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Real-time mule-chain interception powered by VarunaGAT + VarunaLSTM + 10-flag RBI rule engine.
            Detect, predict, freeze, and brief before funds disappear.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusPill icon={AlertTriangle} label="Threat Index" value={`${overview.threat_index}/100`} tone="red" />
            <StatusPill icon={TimerReset} label="Intercept Window" value={formatSeconds(overview.average_intercept_time_seconds)} tone="orange" />
            <StatusPill icon={ShieldCheck} label="Case Mode" value={activeCase.threat_level} tone="cyan" />
          </div>
          {/* Inject Fraud Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleInjectFraud}
            disabled={injecting}
            className={`w-full rounded-2xl border px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
              injecting
                ? "border-red/50 bg-red/20 text-red cursor-wait"
                : "border-red/30 bg-red/10 text-red hover:bg-red/20 hover:border-red/50"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Siren size={16} className={injecting ? "animate-spin" : ""} />
              {injecting ? "Injecting Fraud Sequence…" : "Inject Fraud Sequence"}
            </span>
          </motion.button>
        </div>
      </header>

      <section className="mb-6 rounded-[28px] border border-line/70 bg-black/20 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-3">
          {[
            { id: "command", label: "Command Center" },
            { id: "ml", label: "ML Models", icon: Brain },
            { id: "states", label: "States" },
            { id: "banks", label: "Banks" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveDashboard(item.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                activeDashboard === item.id
                  ? "border-cyan/30 bg-cyan/10 text-cyan"
                  : "border-line bg-white/[0.02] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              {item.icon && <item.icon size={12} />}
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Active Suspicious Chains"
          value={overview.active_suspicious_chains}
          hint="Simultaneous mule ladders in progress"
          accent="red"
        />
        <MetricCard
          label="Recoverable Amount"
          value={formatCurrency(overview.recoverable_amount)}
          hint="Projected funds salvageable with current freeze path"
        />
        <MetricCard
          label="Funds Dissipated"
          value={formatCurrency(overview.funds_already_dissipated)}
          hint="Amount already lost to off-ramp rails"
          accent="orange"
        />
        <MetricCard
          label="Banks Affected"
          value={overview.banks_affected}
          hint="Cross-institution coordination required"
        />
        <MetricCard
          label="Average Intercept Time"
          value={formatSeconds(overview.average_intercept_time_seconds)}
          hint={overview.urgency}
        />
      </section>

      {activeDashboard === "command" && (
        <>
          <section className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <ThreatGraph graph={data.graph} selectedCase={activeCase} onNodeClick={handleSelectAccount} />
            <div className="space-y-6">
              <EventFeed events={data.event_feed} />
              <AnimatePresence>
                {selectedNode && (
                  <NodeDetailPanel
                    node={selectedNode}
                    score={scoreByAccount[selectedNodeId]}
                    onClose={() => setSelectedNodeId(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="mb-6">
            <India3DModelPanel />
          </section>

          <section className="mb-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="space-y-6">
              <CaseSpotlight caseItem={activeCase} />
              <TimelinePanel timeline={data.timeline} />
            </div>
            <SentinelPanel scores={data.sentinel_scores} onSelectAccount={handleSelectAccount} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <InterceptPanel intercept={data.intercept} />
            <BriefPanel brief={data.brief} caseItem={activeCase} />
          </section>
        </>
      )}

      {activeDashboard === "ml" && (
        <section className="grid gap-6">
          <ModelMetricsPanel metrics={data.model_metrics} />
        </section>
      )}

      {activeDashboard === "states" && (
        <section className="grid gap-6">
          <StatesHero />
          <India3DModelPanel />
          <StatesSection states={stateIntel} />
        </section>
      )}

      {activeDashboard === "banks" && (
        <section className="grid gap-6">
          <BanksHero />
          <BanksSection banks={bankIntel.banks} />
        </section>
      )}
    </Shell>
  );
}

function StatusPill({ icon: Icon, label, value, tone }) {
  const tones = {
    red: "border-red/30 bg-red/10 text-red",
    orange: "border-orange/30 bg-orange/10 text-orange",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  };

  return (
    <div className={`rounded-3xl border px-4 py-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
        <Icon size={14} />
        {label}
      </div>
      <div className="font-display text-xl text-white">{value}</div>
    </div>
  );
}

function CaseSpotlight({ caseItem }) {
  const stats = [
    { label: "Chain Confidence", value: `${caseItem.chain_confidence}%` },
    { label: "Human Coordination", value: `${caseItem.human_coordination_score}%` },
    { label: "Dissipation Risk", value: `${caseItem.dissipation_risk}%` },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={caseItem.case_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="panel overflow-hidden p-6"
      >
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-red">
              Case Detail Mode
            </div>
            <div className="font-display text-3xl text-white">{caseItem.title}</div>
            <div className="mt-3 max-w-3xl text-slate-300">
              Victim-origin funds entered a coordinated mule chain, expanded across three hops, and began dissipation toward wallet and cash-out rails before VARUNA initiated cross-bank interception.
            </div>
          </div>
          <div className="rounded-3xl border border-line/70 bg-black/20 px-5 py-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Flagged Source</div>
            <div className="mt-2 font-display text-xl text-white">{caseItem.flagged_source_account}</div>
            <div className="mt-3 text-sm text-orange">
              Predicted next-hop spread: {caseItem.predicted_next_hops.join(", ")}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-line/70 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
              <div className="mt-3 font-display text-3xl text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatesHero() {
  return (
    <div className="panel p-6">
      <div className="mb-2 inline-flex rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
        State Dashboard
      </div>
      <div className="font-display text-3xl text-white">State-wise Fraud Spread Intelligence</div>
      <div className="mt-3 max-w-3xl text-slate-300">
        View the fraud chain bifurcated by impacted states, linked banks, suspicious accounts, frozen accounts, and anomaly signatures.
      </div>
    </div>
  );
}

function BanksHero() {
  return (
    <div className="panel p-6">
      <div className="mb-2 inline-flex rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange">
        Bank Dashboard
      </div>
      <div className="font-display text-3xl text-white">Bank-wise Operational Anomaly View</div>
      <div className="mt-3 max-w-3xl text-slate-300">
        Open the bank dashboard to inspect each bank as its own subsection with exposure, linked states, suspicious accounts, freeze status, and anomaly narrative.
      </div>
    </div>
  );
}
