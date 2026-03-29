import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import {
  PlayCircle,
  Database,
  Search,
  Brain,
  ShieldAlert,
  ArrowRight,
  Zap,
  Lock,
  Target,
  FileCheck,
  Server,
  Eye,
  AlertTriangle,
  ArrowDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../lib/api";

const STEPS = [
  { id: 0, title: "The Watchtower", desc: "We're watching everything", icon: Eye },
  { id: 1, title: "Follow the Money", desc: "Who sent money to whom?", icon: Search },
  { id: 2, title: "The 4 Brains", desc: "Our AI detectives analyze", icon: Brain },
  { id: 3, title: "The Math", desc: "How we calculate the risk", icon: Zap },
  { id: 4, title: "The Verdict", desc: "What we did about it", icon: Lock },
];

export function DemoPipelinePanel() {
  const { authFetch } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetAccount, setTargetAccount] = useState(null);

  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [deepExplainData, setDeepExplainData] = useState(null);

  const [loading, setLoading] = useState(false);

  // Load step data from the Live APIs
  const loadStepData = async (step) => {
    setLoading(true);
    try {
      if (step === 0) {
        const res = await authFetch(`${getApiBase()}/dashboard`);
        const json = await res.json();
        setDashboardData(json);
        if (json?.cases?.[0]) {
          setTargetAccount(json.cases[0].flagged_source_account);
        }
      } else if (step === 1 && targetAccount) {
        const [chainRes, explainRes] = await Promise.all([
          authFetch(`${getApiBase()}/chain/${targetAccount}`),
          authFetch(`${getApiBase()}/deep-explain/${targetAccount}`),
        ]);
        setChainData(await chainRes.json());
        setDeepExplainData(await explainRes.json());
      }
      // Steps 2, 3, 4 reuse deepExplainData loaded in step 1
    } catch (err) {
      console.error("Demo API Error:", err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    loadStepData(currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const advanceStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setDeepExplainData(null);
    setChainData(null);
  };

  const getCurrentPayload = () => {
    if (loading) return { status: "Querying VARUNA backend..." };
    switch(currentStep) {
      case 0: return dashboardData || { status: "Awaiting national UPI telemetry..." };
      case 1: return { chain: chainData, explain: deepExplainData } || { status: "Extracting Graph & Running ML inference..." };
      case 2: return deepExplainData ? {
        brain_1_gat: deepExplainData.brain_1_gat,
        brain_2_lstm: deepExplainData.brain_2_lstm,
        brain_3_eif: deepExplainData.brain_3_eif,
        brain_4_rules: deepExplainData.brain_4_rules,
        graph_role: deepExplainData.graph_role
      } : {};
      case 3: return deepExplainData?.final_calculation || {};
      case 4: return { verdict: deepExplainData?.final_calculation, target: targetAccount };
      default: return {};
    }
  };

  const getExecutionTrace = () => {
    if (loading) return "[SYSTEM] Waiting for API response...\n";
    let trace = "";
    switch(currentStep) {
      case 0: 
        trace = "➤ CALL: GET /api/dashboard\n➤ FILE: backend/app/services/dashboard.py\n➤ ACTION: Fetching national UPI memory graph...\n";
        break;
      case 1:
        trace = `➤ CALL: GET /api/chain/${targetAccount || '{target}'}\n➤ FILE: backend/app/services/detection.py\n➤ ACTION: Extracting 3-hop mule chain topography limit 50...\n`;
        break;
      case 2:
        trace = `➤ CALL: GET /api/deep-explain/${targetAccount || '{target}'}\n➤ SCRIPT: \`backend/app/services/ml_models.py\`\n➤ MODELS ENGAGED:\n   - backend/ml/models/gat_finetuned.pt (Shape)\n   - backend/ml/models/lstm_temporal.pt (Timing)\n   - Extended Isolation Forest (scikit-learn)\n   - RBI 10-Flag Rule Heuristics\n`;
        break;
      case 3:
      case 4:
        trace = `➤ CALL: GET /api/deep-explain/${targetAccount || '{target}'}\n➤ FILE: backend/app/services/detection.py\n➤ ACTION: Executing cross-pillar fusion algorithm (Weights: 0.35, 0.25, 0.20, 0.20)\n`;
        break;
    }
    return "[EXECUTION TRACE — FILE PROVENANCE]\n" + trace + "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n[RAW JSON PAYLOAD FROM SCRIPT]\n";
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <PlayCircle size={24} className="text-purple-400" />
          <div className="font-display text-2xl text-white">
            How VARUNA Catches Criminals — Step by Step
          </div>
        </div>
        <p className="max-w-3xl text-white/50">
          This is a live, transparent walkthrough. Every number you see below is
          calculated in real-time by our backend AI models, not hardcoded. We'll
          show you exactly <strong className="text-white">how</strong> and{" "}
          <strong className="text-white">why</strong> each account gets flagged.
        </p>

        {/* Stepper */}
        <div className="mt-8 flex items-center justify-between px-2">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isPassed = currentStep > step.id;
            return (
              <div
                key={step.id}
                className="flex flex-col items-center gap-2 flex-1 relative"
              >
                {step.id < STEPS.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 transition-colors ${isPassed ? "bg-purple-500" : "bg-line/40"}`}
                  />
                )}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-500 shadow-xl ${
                    isActive
                      ? "border-purple-400 bg-purple-400/20 text-purple-400 scale-110"
                      : isPassed
                        ? "border-purple-500 bg-purple-500 text-white"
                        : "border-slate-700 bg-slate-800 text-white/30"
                  }`}
                >
                  <step.icon size={18} />
                </div>
                <div
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider text-center max-w-[100px] transition-colors ${
                    isActive
                      ? "text-purple-300"
                      : isPassed
                        ? "text-white/50"
                        : "text-white/25"
                  }`}
                >
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="min-h-[400px]"
        >
          {loading ? (
            <div className="panel flex flex-col min-h-[400px] items-center justify-center p-12 text-purple-400/70">
              <Server size={32} className="animate-pulse mb-4" />
              <span className="font-mono text-sm">
                Querying VARUNA backend...
              </span>
            </div>
          ) : (
            <div
              className={`grid gap-6 min-h-[500px] transition-all duration-700 ${currentStep < 2 ? "xl:grid-cols-[1.4fr_1fr]" : "max-w-5xl mx-auto w-full"}`}
            >
              {/* Left Pane - Live Graph (shown for steps 0, 1) */}
              <AnimatePresence mode="wait">
                {currentStep < 2 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="panel p-0 overflow-hidden relative border-purple-500/20 shadow-purple-900/10 shadow-2xl h-[550px] xl:h-[600px]"
                  >
                    {dashboardData?.graph && (
                      <SimulationGraph
                        graph={dashboardData.graph}
                        chainData={chainData}
                        step={currentStep}
                        target={targetAccount}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Right Pane - Step Content */}
              <div className="panel p-6 lg:p-10 border-purple-500/20 shadow-purple-900/10 shadow-2xl relative overflow-hidden flex flex-col h-auto min-h-[550px] xl:min-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/5 blur-3xl rounded-full pointer-events-none" />

                {currentStep === 0 && (
                  <Step0_Watchtower data={dashboardData} />
                )}
                {currentStep === 1 && (
                  <Step1_FollowMoney
                    data={chainData}
                    explain={deepExplainData}
                    target={targetAccount}
                  />
                )}
                {currentStep === 2 && (
                  <Step2_FourBrains explain={deepExplainData} />
                )}
                {currentStep === 3 && (
                  <Step3_TheMath explain={deepExplainData} />
                )}
                {currentStep === 4 && (
                  <Step4_Verdict
                    explain={deepExplainData}
                    target={targetAccount}
                  />
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={resetDemo}
          disabled={currentStep === 0}
          className="px-5 py-2.5 rounded-xl border border-line text-white/40 hover:text-white transition uppercase text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={advanceStep}
          disabled={currentStep === STEPS.length - 1 || loading}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition uppercase text-xs tracking-widest font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
        >
          Next Step <ArrowRight size={14} />
        </button>
      </div>

      {/* Live Backend API Response Log */}
      <div className="mt-8 panel p-0 overflow-hidden border-slate-700/50 shadow-2xl">
        <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
            <Server size={14} className="text-emerald-500" />
            <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Live Backend API Payload (Raw JSON)</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[9px] text-slate-500 uppercase opacity-60">Demonstration Trace Evidence</span>
          </div>
          <div className="flex gap-1.5 opacity-60">
            <div className="w-2.5 h-2.5 rounded-full bg-red"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-orange"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          </div>
        </div>
        <div className="p-4 bg-[rgb(5,5,5)] font-mono text-[11px] overflow-y-auto max-h-[400px] scrollbar-thin text-emerald-400">
          <pre className="whitespace-pre-wrap word-break">
<span className="text-slate-400">{getExecutionTrace()}</span>
{JSON.stringify(getCurrentPayload(), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 0 — The Watchtower
   "We're watching millions of transactions across all banks."
   ═══════════════════════════════════════════════════════════════════ */
function Step0_Watchtower({ data }) {
  if (!data)
    return <p className="text-white/30 font-mono">Loading data…</p>;
  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10">
      <h2 className="text-2xl font-display text-white mb-2">
        🏰 Step 1: The Watchtower
      </h2>
      <p className="text-white/50 text-sm mb-6 leading-relaxed">
        Imagine we're sitting in a control room, watching{" "}
        <strong className="text-white">every single bank transfer</strong>{" "}
        happening across India in real-time — like CCTV, but for money.
        Right now, our system is tracking:
      </p>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          icon={Database}
          label="Bank Accounts Being Watched"
          value={data.graph?.nodes?.length || "0"}
          color="cyan"
        />
        <InfoCard
          icon={ArrowRight}
          label="Money Transfers Being Tracked"
          value={data.graph?.links?.length || "0"}
          color="emerald"
        />
      </div>

      <div className="mt-4 bg-red/5 border border-red/30 rounded-2xl p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 text-red" size={28} />
        <div className="text-xs uppercase text-red tracking-[0.2em] mb-1">
          Suspicious chains found right now
        </div>
        <div className="text-4xl font-display text-white">
          {data.national_overview?.active_suspicious_chains || 0}
        </div>
        <p className="text-white/40 text-xs mt-2">
          These are groups of accounts where money is moving in a pattern
          that looks like fraud — before anyone has even reported it.
        </p>
      </div>

      <div className="mt-4 bg-purple-500/5 border border-purple-500/30 rounded-2xl p-4">
        <p className="text-purple-300 text-sm leading-relaxed">
          👉 <strong>What happens next?</strong> One of these suspicious
          chains has been automatically flagged. We'll now zoom in on the
          most dangerous account and show you exactly why our AI thinks
          it's a criminal.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1 — Follow the Money
   "Here's who we flagged and where the money went."
   ═══════════════════════════════════════════════════════════════════ */
function Step1_FollowMoney({ data, explain, target }) {
  if (!explain)
    return <p className="text-white/30 font-mono">Analyzing target…</p>;

  const info = explain.node_info;
  const txSummary = explain.transaction_summary;

  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10">
      <h2 className="text-2xl font-display text-white mb-2">
        🔍 Step 2: Follow the Money
      </h2>

      {/* Flagged Account Card */}
      <div className="bg-red/5 border border-red/40 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 text-xs text-red uppercase tracking-[0.2em] mb-3">
          <AlertTriangle size={14} />
          Flagged Account
        </div>
        <div className="font-mono text-lg text-white mb-1">{target}</div>
        <div className="text-white/40 text-sm">
          Bank:{" "}
          <span className="text-white font-medium">{info?.bank || "—"}</span>{" "}
          · Type:{" "}
          <span className="text-orange font-medium uppercase">
            {info?.node_type || "—"}
          </span>
        </div>
      </div>

      {/* Money Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStat
          label="Total Received"
          value={`₹${(txSummary.total_received || 0).toLocaleString()}`}
          color="emerald"
        />
        <MiniStat
          label="Total Sent Out"
          value={`₹${(txSummary.total_sent || 0).toLocaleString()}`}
          color="red"
        />
        <MiniStat
          label="Connected To"
          value={`${txSummary.unique_counterparties || 0} accounts`}
          color="orange"
        />
      </div>

      <p className="text-white/50 text-sm mb-3 leading-relaxed">
        💡 <strong className="text-white">In simple terms:</strong> This
        account received{" "}
        <span className="text-[#FF4500] font-semibold">
          ₹{(txSummary.total_received || 0).toLocaleString()}
        </span>{" "}
        and rapidly sent out{" "}
        <span className="text-red font-semibold">
          ₹{(txSummary.total_sent || 0).toLocaleString()}
        </span>{" "}
        to {txSummary.unique_counterparties || 0} different accounts across{" "}
        {txSummary.banks_involved?.length || 0} different banks. This is
        classic "money laundering" behavior — money comes in and
        immediately goes out to hide its origins.
      </p>

      {/* Transaction list */}
      <div className="bg-black/40 border border-white/[0.03] rounded-xl p-3 flex-1 overflow-y-auto custom-scrollbar max-h-[200px]">
        <div className="text-[10px] uppercase text-white/30 tracking-wider mb-2 font-bold">
          📊 Actual Transactions (Live Data)
        </div>
        <div className="space-y-2 font-mono text-xs">
          {txSummary.transactions?.slice(0, 8).map((tx, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tx.direction === "SENT" ? "bg-red/10 text-red" : "bg-emerald-500/10 text-[#FF4500]"}`}
              >
                {tx.direction === "SENT" ? "↑ SENT" : "↓ GOT"}
              </span>
              <span className="text-white/40 truncate flex-1" title={tx.direction === "SENT" ? tx.to : tx.from}>
                {tx.direction === "SENT" ? `→ ${tx.to}` : `← ${tx.from}`}
              </span>
              <span className="text-white font-semibold whitespace-nowrap">
                ₹{tx.amount?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 2 — The 4 Brains
   "Here's how each AI detective analyzed this account."
   ═══════════════════════════════════════════════════════════════════ */
function Step2_FourBrains({ explain }) {
  if (!explain)
    return <p className="text-white/30 font-mono">Loading analysis…</p>;

  const brains = [
    {
      data: explain.brain_1_gat,
      icon: "🧠",
      title: "Brain 1: The Shape Matcher",
      subtitle: "Graph Attention Network (GAT)",
      color: "emerald",
      borderColor: "border-[#FF4500]/30",
      bgColor: "bg-emerald-500/5",
      barColor: "bg-emerald-500",
    },
    {
      data: explain.brain_2_lstm,
      icon: "⏱️",
      title: "Brain 2: The Timing Expert",
      subtitle: "Long Short-Term Memory (LSTM)",
      color: "cyan",
      borderColor: "border-[#FF4500]/30",
      bgColor: "bg-[#FF4500]/5",
      barColor: "bg-[#FF4500]",
    },
    {
      data: explain.brain_3_eif,
      icon: "🔬",
      title: "Brain 3: The Outlier Detector",
      subtitle: "Extended Isolation Forest (EIF)",
      color: "purple",
      borderColor: "border-purple-500/30",
      bgColor: "bg-purple-500/5",
      barColor: "bg-purple-500",
    },
    {
      data: explain.brain_4_rules,
      icon: "📋",
      title: "Brain 4: The Rule Book",
      subtitle: "10-Flag RBI Engine",
      color: "red",
      borderColor: "border-red/30",
      bgColor: "bg-red/5",
      barColor: "bg-red",
    },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10">
      <h2 className="text-2xl font-display text-white mb-2">
        🧠 Step 3: The 4 Brains
      </h2>
      <p className="text-white/50 text-sm mb-5 leading-relaxed">
        VARUNA doesn't rely on just one opinion. It uses{" "}
        <strong className="text-white">4 completely different AI systems</strong>{" "}
        to analyze the suspect. Each one looks at the problem from a
        different angle. Here's what each brain found:
      </p>

      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
        {brains.map((brain, i) => (
          <BrainCard key={i} {...brain} />
        ))}
      </div>

      {/* Graph role */}
      <div className="mt-4 bg-orange/5 border border-orange/30 rounded-2xl p-4">
        <div className="text-xs text-orange uppercase tracking-wider mb-2 font-bold">
          🕸️ Network Role: {explain.graph_role?.role}
        </div>
        <p className="text-white/50 text-sm leading-relaxed">
          {explain.graph_role?.layman}
        </p>
      </div>
    </div>
  );
}

function BrainCard({ data, icon, title, subtitle, borderColor, bgColor, barColor }) {
  if (!data) return null;
  return (
    <div className={`${bgColor} border ${borderColor} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-bold text-white">
            {icon} {title}
          </div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider">
            {subtitle}
          </div>
        </div>
        <div className="text-2xl font-display text-white">
          {data.score_pct}%
        </div>
      </div>
      {/* Score bar */}
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-white/[0.03] mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.score_pct}%` }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          className={`h-full ${barColor} shadow-[0_0_10px_rgba(168,85,247,0.5)]`}
        />
      </div>
      <p className="text-white/40 text-xs leading-relaxed">{data.layman}</p>

      {/* Show triggered rules for Rule Book */}
      {data.flag_hits && data.flag_hits.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] text-red uppercase tracking-wider font-bold">
            Rules Broken:
          </div>
          {data.flag_hits.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs bg-black/30 p-2 rounded-lg border border-red/20"
            >
              <XCircle size={12} className="text-red mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-red font-mono font-bold">{f.flag}</span>
                <span className="text-white/40 mx-1">—</span>
                <span className="text-white/50">
                  {data.all_flags?.[f.flag]?.name}: {f.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 3 — The Math
   "Here's the exact calculation, line by line."
   ═══════════════════════════════════════════════════════════════════ */
function Step3_TheMath({ explain }) {
  if (!explain)
    return <p className="text-white/30 font-mono">Loading calculation…</p>;

  const calc = explain.final_calculation;
  const gat = explain.brain_1_gat;
  const lstm = explain.brain_2_lstm;
  const eif = explain.brain_3_eif;
  const rules = explain.brain_4_rules;
  const role = explain.graph_role;

  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10">
      <h2 className="text-2xl font-display text-white mb-2">
        🧮 Step 4: The Math — Live Calculation
      </h2>
      <p className="text-white/50 text-sm mb-4 leading-relaxed">
        Here's the{" "}
        <strong className="text-white">exact formula</strong> VARUNA used.
        Every number below was <em>just</em> calculated by our backend —
        nothing is hardcoded.
      </p>

      {/* The Formula */}
      <div className="bg-black/50 border border-purple-500/40 rounded-2xl p-5 mb-4 font-mono text-sm">
        <div className="text-purple-300 text-xs uppercase tracking-wider mb-3 font-bold">
          📐 The Formula
        </div>
        <div className="text-white/50 mb-4 text-xs leading-relaxed">
          Final Score = (Shape × 35%) + (Timing × 25%) + (Outlier × 20%) + (Rules × 20%) × Role Multiplier
        </div>

        {/* Line-by-line math */}
        <div className="space-y-2">
          <CalcLine
            emoji="🧠"
            label="Shape Score (GAT)"
            value={gat?.score_pct}
            weight={35}
            result={gat?.weighted_contribution ? (gat.weighted_contribution * 100).toFixed(2) : "—"}
            color="text-[#FF4500]"
          />
          <CalcLine
            emoji="⏱️"
            label="Timing Score (LSTM)"
            value={lstm?.score_pct}
            weight={25}
            result={lstm?.weighted_contribution ? (lstm.weighted_contribution * 100).toFixed(2) : "—"}
            color="text-[#FF4500]"
          />
          <CalcLine
            emoji="🔬"
            label="Outlier Score (EIF)"
            value={eif?.score_pct}
            weight={20}
            result={eif?.weighted_contribution ? (eif.weighted_contribution * 100).toFixed(2) : "—"}
            color="text-purple-400"
          />
          <CalcLine
            emoji="📋"
            label="Rule Breaches"
            value={rules?.score_pct}
            weight={20}
            result={rules?.weighted_contribution ? (rules.weighted_contribution * 100).toFixed(2) : "—"}
            color="text-red"
          />

          <div className="border-t border-dashed border-white/[0.04] my-2" />

          <div className="flex justify-between text-sm">
            <span className="text-white/40">Base Score (sum)</span>
            <span className="text-white font-bold">
              {calc?.raw_combined_pct}%
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-white/40">
              Role Multiplier ({role?.role}){" "}
              <span className="text-orange">×{role?.role_multiplier}</span>
            </span>
            <span className="text-orange font-mono text-xs">
              {role?.role === "HUB"
                ? "spider in the web → 1.25x"
                : role?.role === "BRIDGE"
                  ? "connecting clusters → 1.15x"
                  : role?.role === "MULE"
                    ? "pass-through → 1.10x"
                    : "no boost → 1.0x"}
            </span>
          </div>

          <div className="border-t-2 border-white/20 my-2" />

          <div className="flex justify-between items-center">
            <span className="text-white font-bold text-lg uppercase tracking-wider">
              Final Risk Score
            </span>
            <span className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-red to-orange drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
              {calc?.final_score_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Threshold explanation */}
      <div className="bg-black/40 border border-white/[0.03] rounded-2xl p-4">
        <div className="text-xs text-white/30 uppercase tracking-wider mb-2 font-bold">
          What does this score mean?
        </div>
        <div className="space-y-2 text-sm">
          <ThresholdRow
            range="75% – 100%"
            label="BLOCK"
            desc="Automatically freeze the account"
            active={calc?.final_score_pct >= 75}
            color="red"
          />
          <ThresholdRow
            range="45% – 74%"
            label="REVIEW"
            desc="Human analyst needs to look at this"
            active={calc?.final_score_pct >= 45 && calc?.final_score_pct < 75}
            color="orange"
          />
          <ThresholdRow
            range="0% – 44%"
            label="APPROVE"
            desc="Low risk — no action needed"
            active={calc?.final_score_pct < 45}
            color="emerald"
          />
        </div>
      </div>
    </div>
  );
}

function CalcLine({ emoji, label, value, weight, result, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-5 text-center">{emoji}</span>
      <span className={`${color} w-[140px] truncate`}>{label}</span>
      <span className="text-white w-[45px] text-right">{value}%</span>
      <span className="text-white/30 mx-1">×</span>
      <span className="text-white/40 w-[30px]">{weight}%</span>
      <span className="text-white/30 mx-1">=</span>
      <span className="text-white font-bold ml-auto">{result}%</span>
    </div>
  );
}

function ThresholdRow({ range, label, desc, active, color }) {
  const colors = {
    red: "border-red/40 bg-red/10 text-red",
    orange: "border-orange/40 bg-orange/10 text-orange",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-[#FF4500]",
  };
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${active ? colors[color] : "border-line/20 bg-black/20 text-white/30"}`}
    >
      {active ? (
        <CheckCircle size={14} className="flex-shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
      )}
      <span className="font-mono text-xs font-bold w-[70px]">{range}</span>
      <span className="font-bold text-xs uppercase tracking-wider w-[60px]">
        {label}
      </span>
      <span className="text-xs opacity-70">{desc}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 4 — The Verdict
   "What we did about it and why."
   ═══════════════════════════════════════════════════════════════════ */
function Step4_Verdict({ explain, target }) {
  if (!explain)
    return <p className="text-white/30 font-mono">Loading verdict…</p>;

  const calc = explain.final_calculation;
  const info = explain.node_info;

  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10">
      <h2 className="text-2xl font-display text-white mb-2">
        ⚖️ Step 5: The Verdict
      </h2>

      {/* Decision Banner */}
      <div
        className={`rounded-3xl p-8 text-center relative overflow-hidden mb-6 ${
          calc?.decision === "BLOCK"
            ? "bg-red/10 border-2 border-red/50"
            : calc?.decision === "REVIEW"
              ? "bg-orange/10 border-2 border-orange/50"
              : "bg-emerald-500/10 border-2 border-emerald-500/50"
        }`}
      >
        {calc?.decision === "BLOCK" && (
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,0,0,0.08)_25%,transparent_25%,transparent_50%,rgba(255,0,0,0.08)_50%,rgba(255,0,0,0.08)_75%,transparent_75%,transparent_100%)] bg-[length:40px_40px] pointer-events-none" />
        )}
        <Lock
          size={48}
          className={`mx-auto mb-4 ${calc?.decision === "BLOCK" ? "text-red" : calc?.decision === "REVIEW" ? "text-orange" : "text-[#FF4500]"} drop-shadow-[0_0_20px_rgba(255,0,0,0.6)]`}
        />
        <div className="text-3xl font-display font-bold text-white uppercase tracking-[0.3em] mb-2 relative z-10">
          {calc?.decision === "BLOCK"
            ? "🚨 ACCOUNT FROZEN"
            : calc?.decision === "REVIEW"
              ? "⚠️ SENT FOR REVIEW"
              : "✅ ACCOUNT CLEARED"}
        </div>
        <div className="font-mono text-sm text-white/50 bg-black/30 px-4 py-2 rounded-xl inline-block relative z-10">
          {target}
        </div>
      </div>

      {/* Why */}
      <div className="bg-black/40 border border-white/[0.04] rounded-2xl p-5 mb-4">
        <div className="text-xs text-white/30 uppercase tracking-wider mb-3 font-bold">
          Why?
        </div>
        <p className="text-white/50 text-sm leading-relaxed">
          {calc?.decision === "BLOCK" ? (
            <>
              Account{" "}
              <span className="text-white font-mono font-bold">{target}</span>{" "}
              at <span className="text-white">{info?.bank || "Unknown Bank"}</span>{" "}
              scored{" "}
              <span className="text-red font-bold text-lg">
                {calc?.final_score_pct}%
              </span>{" "}
              on VARUNA's risk engine. This is above the{" "}
              <strong className="text-red">75% automatic freeze threshold</strong>.{" "}
              Because the risk was critically high, VARUNA automatically sent a{" "}
              <strong className="text-white">freeze command</strong> to the bank
              — all outgoing transfers from this account are now blocked.
              No more money can escape the network.
            </>
          ) : calc?.decision === "REVIEW" ? (
            <>
              Account{" "}
              <span className="text-white font-mono font-bold">{target}</span>{" "}
              scored{" "}
              <span className="text-orange font-bold text-lg">
                {calc?.final_score_pct}%
              </span>
              . This is suspicious but below the automatic freeze threshold.
              A human analyst has been notified to review the case manually.
            </>
          ) : (
            <>
              Account{" "}
              <span className="text-white font-mono font-bold">{target}</span>{" "}
              scored only{" "}
              <span className="text-[#FF4500] font-bold text-lg">
                {calc?.final_score_pct}%
              </span>
              . This is within the normal range. No action was taken.
            </>
          )}
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-purple-500/5 border border-purple-500/30 rounded-2xl p-4 text-xs text-white/40 leading-relaxed">
        <div className="text-purple-300 font-bold uppercase text-[10px] tracking-wider mb-2">
          Complete Timeline
        </div>
        <ol className="space-y-1.5 list-decimal list-inside">
          <li>🏰 Watchtower detected suspicious chain in the network</li>
          <li>🔍 Narrowed down on account <span className="text-white font-mono">{target}</span></li>
          <li>🧠 4 AI brains independently scored the account</li>
          <li>🧮 Weighted formula produced a score of <span className="text-white font-bold">{calc?.final_score_pct}%</span></li>
          <li>{calc?.decision === "BLOCK" ? "🚨 Account frozen automatically — money saved" : calc?.decision === "REVIEW" ? "⚠️ Case sent to analyst for manual review" : "✅ Account cleared — no threat detected"}</li>
        </ol>
      </div>
    </div>
  );
}

/* ── Helper Components ── */
function InfoCard({ icon: Icon, label, value, color }) {
  const colors = { cyan: "text-[#FF4500]", emerald: "text-[#FF4500]", red: "text-red", orange: "text-orange" };
  return (
    <div className="bg-black/30 border border-white/[0.04] rounded-2xl p-5 text-center shadow-lg">
      <Icon className={`mx-auto mb-3 ${colors[color]}`} size={24} />
      <div className="text-[10px] uppercase text-white/30 tracking-[0.15em] mb-1">
        {label}
      </div>
      <div className="text-3xl font-display text-white">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  const colors = {
    emerald: "border-[#FF4500]/30 text-[#FF4500]",
    red: "border-red/30 text-red",
    orange: "border-orange/30 text-orange",
  };
  return (
    <div className={`border rounded-xl p-3 text-center ${colors[color]}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-70 mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

/* ── Simulation Graph (unchanged) ── */
function SimulationGraph({ graph, chainData, step, target }) {
  const fgRef = useRef();
  const prevStepRef = useRef(step);

  const visualData = useMemo(() => {
    const chainAccounts = chainData?.accounts || [];
    const isExtractionState = step >= 1 && chainAccounts.length > 0;

    return {
      nodes: graph.nodes.map((n) => {
        const inChain = isExtractionState ? chainAccounts.includes(n.id) : true;
        const isTarget = isExtractionState && n.id === target;
        return {
          ...n,
          isVisible: inChain,
          isTarget,
          renderColor: isExtractionState
            ? inChain
              ? isTarget ? "#ef4444" : "#f97316"
              : "rgba(255,255,255,0.05)"
            : n.node_type === "victim"
              ? "#4da6ff"
              : n.node_type === "mule"
                ? "#e8475f"
                : "#f0a040",
          renderSize: isExtractionState
            ? inChain
              ? isTarget ? 14 : 10
              : 3
            : 6,
        };
      }),
      links: graph.links.map((l) => {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        const inChain = isExtractionState
          ? chainAccounts.includes(srcId) && chainAccounts.includes(tgtId)
          : true;
        return {
          ...l,
          isVisible: inChain,
          renderColor: isExtractionState
            ? inChain ? "rgba(249, 115, 22, 0.6)" : "rgba(255,255,255,0.02)"
            : "rgba(100, 140, 190, 0.4)",
          renderWidth: isExtractionState ? (inChain ? 2 : 0.5) : 1,
        };
      }),
    };
  }, [graph, chainData, step, target]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-250);
    fg.d3Force("link")?.distance(60);

    if (step === 0 && prevStepRef.current !== 0) {
      fg.zoomToFit(800, 20);
    } else if (step === 1 && prevStepRef.current === 0 && chainData) {
      setTimeout(() => {
        const chainAccounts = chainData?.accounts || [];
        if (chainAccounts.length > 0) {
          fg.zoomToFit(1200, 80, (node) => chainAccounts.includes(node.id));
        }
      }, 800);
    }
    prevStepRef.current = step;
  }, [step, chainData, visualData]);

  return (
    <div className="absolute inset-0 bg-black/40">
      <ForceGraph2D
        ref={fgRef}
        graphData={visualData}
        backgroundColor="transparent"
        nodeColor={(n) => n.renderColor}
        nodeVal={(n) => n.renderSize}
        linkColor={(l) => l.renderColor}
        linkWidth={(l) => l.renderWidth}
        linkDirectionalParticles={(l) => (l.isVisible ? 2 : 0)}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        nodeLabel={(n) =>
          n.isVisible ? `${n.id} (${n.bank || "Unknown"})` : ""
        }
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.4}
        cooldownTicks={100}
        enableZoomPanInteraction={true}
        enablePointerInteraction={true}
      />

      <div className="absolute top-4 left-4 bg-black/60 border border-white/[0.05] p-3 rounded-xl backdrop-blur-sm shadow-xl z-10 pointer-events-none">
        <div className="text-[10px] uppercase text-white/40 font-bold tracking-[0.2em] mb-2 border-b border-white/[0.03] pb-1">
          Live Network
        </div>
        {step === 0 ? (
          <div className="text-xs text-white">Full Network — All Accounts</div>
        ) : (
          <div className="text-xs text-orange border-l-2 border-orange pl-2">
            Isolated Chain:{" "}
            <span className="font-mono text-white ml-1">
              {chainData?.accounts?.length || 0} Accounts
            </span>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 flex gap-3 text-[10px] uppercase tracking-wider text-white/30 z-10 pointer-events-none">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f97316]" /> Mule
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Target
        </span>
      </div>
    </div>
  );
}
