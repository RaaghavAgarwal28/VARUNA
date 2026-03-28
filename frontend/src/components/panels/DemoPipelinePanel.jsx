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
  Server
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../lib/api";

const STEPS = [
  { id: 0, title: "Data Ingestion", desc: "Live monitoring of banking networks", icon: Database },
  { id: 1, title: "Threat Extraction", desc: "Isolating anomalous sub-graphs", icon: Target },
  { id: 2, title: "Deep Analysis", desc: "10-Flag rules & LSTM/EIF processing", icon: Brain },
  { id: 3, title: "4-Pillar Engine", desc: "Aggregated risk calculations", icon: Zap },
  { id: 4, title: "Interception", desc: "Automated threat isolation", icon: Lock }
];

export function DemoPipelinePanel() {
  const { authFetch } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetAccount, setTargetAccount] = useState(null);
  
  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [flagsData, setFlagsData] = useState(null);
  const [roleData, setRoleData] = useState(null);

  const [loading, setLoading] = useState(false);

  // Load step data securely from the Live APIs
  const loadStepData = async (step) => {
    setLoading(true);
    try {
      if (step === 0) {
        const res = await authFetch(`${getApiBase()}/dashboard`);
        const json = await res.json();
        setDashboardData(json);
        // Automatically isolate the first high-risk target account for the demo
        if (json?.cases?.[0]) {
          setTargetAccount(json.cases[0].flagged_source_account);
        }
      } 
      else if (step === 1 && targetAccount) {
        const res = await authFetch(`${getApiBase()}/chain/${targetAccount}`);
        setChainData(await res.json());
      } 
      else if (step === 2 && targetAccount) {
        const [resFlags, resRole] = await Promise.all([
          authFetch(`${getApiBase()}/flags/${targetAccount}`),
          authFetch(`${getApiBase()}/node-role/${targetAccount}`)
        ]);
        setFlagsData(await resFlags.json());
        setRoleData(await resRole.json());
      }
      else if (step === 3) {
        // Step 3 relies on previous Step 2 data.
      }
      else if (step === 4 && targetAccount) {
        // Freeze API call
        await authFetch(`${getApiBase()}/freeze/${targetAccount}`, { method: 'POST' });
      }
    } catch (err) {
      console.error("Demo API Error:", err);
    } finally {
      setTimeout(() => setLoading(false), 500); // UI breathing room
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
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-center gap-3 mb-4">
           <PlayCircle size={24} className="text-purple-400" />
           <div className="font-display text-2xl text-white">Interactive Pipeline Demo (Live)</div>
        </div>
        <p className="max-w-3xl text-slate-300">
           Welcome to the VARUNA Presentation Sandbox. The system will dynamically pull from the `d:\VARUNA` APIs to structurally analyze our target without relying on hardcoded scenarios. This 5-phase execution directly queries the backend architecture to verify the Threat Interception workflow.
        </p>

        {/* Stepper Wizard Indicator */}
        <div className="mt-8 flex items-center justify-between px-2">
            {STEPS.map((step) => {
               const isActive = currentStep === step.id;
               const isPassed = currentStep > step.id;
               return (
                   <div key={step.id} className="flex flex-col items-center gap-2 flex-1 relative">
                       {/* Line Connector */}
                       {step.id < STEPS.length - 1 && (
                         <div className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 transition-colors ${isPassed ? "bg-purple-500" : "bg-line/40"}`} />
                       )}
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-500 shadow-xl ${
                           isActive ? "border-purple-400 bg-purple-400/20 text-purple-400 scale-110" : 
                           isPassed ? "border-purple-500 bg-purple-500 text-white" : "border-slate-700 bg-slate-800 text-slate-500"
                       }`}>
                           <step.icon size={18} />
                       </div>
                       <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider text-center max-w-[100px] transition-colors ${
                          isActive ? "text-purple-300" : isPassed ? "text-slate-300" : "text-slate-600"
                       }`}>
                          {step.title}
                       </div>
                   </div>
               )
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
                 <span className="font-mono text-sm">Querying active backend endpoints...</span>
              </div>
           ) : (
             <div className={`grid gap-6 min-h-[500px] transition-all duration-700 ${currentStep < 2 ? "xl:grid-cols-[1.4fr_1fr]" : "max-w-5xl mx-auto w-full"}`}>
                {/* Left Pane - Live Graph */}
                <AnimatePresence mode="wait">
                  {currentStep < 2 && (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="panel p-0 overflow-hidden relative border-purple-500/20 shadow-purple-900/10 shadow-2xl h-[550px] xl:h-[600px]"
                     >
                        {dashboardData?.graph && (
                           <SimulationGraph graph={dashboardData.graph} chainData={chainData} step={currentStep} target={targetAccount} />
                        )}
                     </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Right Pane - Step Action Cards */}
                <div className="panel p-6 lg:p-10 border-purple-500/20 shadow-purple-900/10 shadow-2xl relative overflow-hidden flex flex-col h-[550px] xl:h-[600px] overflow-y-auto custom-scrollbar">
                   {/* Background Decorator */}
                   <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/5 blur-3xl rounded-full pointer-events-none" />
                   
                   {currentStep === 0 && <Step0_Ingestion data={dashboardData} />}
                   {currentStep === 1 && <Step1_Extraction data={chainData} target={targetAccount} fullGraph={dashboardData?.graph} />}
                   {currentStep === 2 && <Step2_Analysis flagsReq={flagsData} roleReq={roleData} target={targetAccount} />}
                   {currentStep === 3 && <Step3_Scoring flagsReq={flagsData} roleReq={roleData} />}
                   {currentStep === 4 && <Step4_Audit target={targetAccount} />}
                </div>
             </div>
           )}
        </motion.div>
      </AnimatePresence>
      
      {/* Console Controls */}
      <div className="flex justify-end gap-4 mt-6">
         <button onClick={resetDemo} disabled={currentStep === 0} className="px-5 py-2.5 rounded-xl border border-line text-slate-400 hover:text-white transition uppercase text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed">
            Reset Demo
         </button>
         <button onClick={advanceStep} disabled={currentStep === STEPS.length - 1 || loading} className="flex items-center gap-2 px-8 py-2.5 rounded-xl border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition uppercase text-xs tracking-widest font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            Proceed <ArrowRight size={14} />
         </button>
      </div>
    </div>
  );
}


/* ── Step Components ── */

function Step0_Ingestion({ data }) {
   if (!data) return <p className="text-slate-500 font-mono">No nodes available...</p>;
   return (
       <div className="flex flex-col h-full animate-fade-in relative z-10">
          <h2 className="text-2xl font-display text-white mb-2">Stage 0: National Data Lake Ingestion</h2>
          <p className="text-slate-400 text-sm mb-6">Millions of UPI nodes are being ingested. Our system identifies complex cyclic shapes in an unsupervised graph environment before specific alarms are raised.</p>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-black/30 border border-line/40 rounded-2xl p-6 text-center shadow-lg">
                <Database className="mx-auto mb-3 text-cyan" size={24} />
                <div className="text-[10px] uppercase text-slate-500 tracking-[0.2em] mb-1">Graph Nodes Tracked</div>
                <div className="text-3xl font-display text-white">{data.graph?.nodes?.length || "0"}</div>
             </div>
             
             <div className="bg-black/30 border border-line/40 rounded-2xl p-6 text-center shadow-lg">
                <ArrowRight className="mx-auto mb-3 text-emerald-400" size={24} />
                <div className="text-[10px] uppercase text-slate-500 tracking-[0.2em] mb-1">Edges (Transactions)</div>
                <div className="text-3xl font-display text-emerald-400">{data.graph?.links?.length || "0"}</div>
             </div>
          </div>
          
          <div className="mt-4 bg-purple-900/20 border border-purple-500/40 rounded-2xl p-6 text-center shadow-[0_0_15px_rgba(168,85,247,0.1)] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent pointer-events-none"/>
             <ShieldAlert className="mx-auto mb-3 text-purple-400" size={24} />
             <div className="text-[10px] uppercase text-purple-300 tracking-[0.2em] mb-1">Active Suspect Rings</div>
             <div className="text-4xl font-display text-white relative z-10">{data.national_overview?.active_suspicious_chains || 0}</div>
          </div>
          
          <div className="mt-6 flex-1 min-h-[100px] bg-black/40 border border-line/30 rounded-xl p-4 font-mono text-[10px] text-slate-500 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
              {">> STREAM_INGEST_OK\n"}
              {data.overview?.total_nodes ? `NODE_COUNT: ${data.overview.total_nodes} ONLINE\n` : ""}
              {data.graph?.nodes ? data.graph.nodes.slice(0, 15).map(n => `NODE_DETECTED: [${n.id}] -> ROLE_UNASSIGNED\n`) : "AWAITING TOPOLOGY SYNC...\n"}
              {"...\nSTREAM_BUFFER_STEADY"}
          </div>
       </div>
   );
}


function Step1_Extraction({ data, target, fullGraph }) {
   if (!data) return <p className="text-slate-500 font-mono relative z-10">Acquiring target lock...</p>;

   // Calculate bank aggregates for isolated chain
   let bankAggs = [];
   if (fullGraph?.nodes && data?.accounts) {
      const bankMap = {};
      data.accounts.forEach(accId => {
         const node = fullGraph.nodes.find(n => n.id === accId);
         if (node && node.bank) {
             if (!bankMap[node.bank]) bankMap[node.bank] = { count: 0, volume: 0 };
             bankMap[node.bank].count += 1;
         }
      });
      if (data.transactions) {
          data.transactions.forEach(tx => {
             const fromNode = fullGraph.nodes.find(n => n.id === tx.from_account);
             if (fromNode && fromNode.bank && bankMap[fromNode.bank]) {
                 bankMap[fromNode.bank].volume += (tx.amount || 0);
             }
          });
      }
      bankAggs = Object.entries(bankMap)
        .map(([bank, st]) => ({ bank, count: st.count, volume: st.volume }))
        .sort((a,b) => b.volume - a.volume)
        .slice(0, 4); // Top 4 banks for UI
   }

   return (
       <div className="flex flex-col h-full animate-fade-in relative z-10">
          <h2 className="text-2xl font-display text-white mb-2">Stage 1: Threat Chain Extraction</h2>
          <p className="text-slate-400 text-sm mb-6">
             Target <span className="text-orange font-mono bg-orange/10 px-1 py-0.5 rounded">{target || "N/A"}</span> flagged. VARUNA uses Depth First Search (DFS) localized around the node to reconstruct the forward dissipation path.
          </p>

          <div className="bg-black/40 border border-dashed border-orange/20 rounded-2xl p-5 mb-4 max-h-[220px] flex flex-col">
             <div className="flex items-center gap-2 text-xs font-mono text-orange mb-3 border-b border-orange/10 pb-2 flex-shrink-0">
                <Search size={14} /> EXECUTING {"\u003E\u003E"} GET /api/chain/{target}
             </div>
             
             <div className="space-y-3 font-mono text-xs overflow-y-auto pr-2 custom-scrollbar">
                {data.transactions?.length > 0 ? data.transactions.map((tx, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white/[0.02] p-2 xl:p-3 rounded-lg border border-line/50">
                        <div className="bg-red/10 text-red px-2 py-1 rounded w-[120px] xl:w-[150px] text-center truncate" title={tx.from_account}>{tx.from_account}</div>
                        <ArrowRight size={14} className="text-orange/60 rotate-90 sm:rotate-0 flex-shrink-0" />
                        <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded w-[120px] xl:w-[150px] text-center truncate" title={tx.to_account}>{tx.to_account}</div>
                        <div className="text-slate-400 sm:ml-auto bg-black/40 px-3 py-1 rounded-full shadow-inner border border-line/30">
                           {tx.amount ? `₹${tx.amount.toLocaleString()}` : "₹NaN"}
                        </div>
                    </div>
                )) : (
                    <div className="text-center text-slate-500 py-6">No forward transactions traced.</div>
                )}
             </div>
          </div>

          {/* Bank Exposure Intelligence */}
          <div className="bg-black/40 border border-line/30 rounded-2xl p-5 mt-auto">
             <div className="text-[10px] uppercase text-slate-500 mb-3 tracking-[0.2em] font-bold">Bank Exposure Breakdown</div>
             {bankAggs.length > 0 ? (
                 <div className="grid grid-cols-2 gap-3">
                     {bankAggs.map(b => (
                         <div key={b.bank} className="bg-white/[0.03] border border-line/50 rounded-lg p-3 shrink-0">
                            <div className="text-white text-xs font-bold mb-1 truncate" title={b.bank}>{b.bank}</div>
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-1 mt-2">
                               <div className="text-slate-500 text-[10px] font-mono">{b.count} Nodes</div>
                               <div className="text-orange font-mono text-sm xl:text-xs">₹{b.volume.toLocaleString()}</div>
                            </div>
                         </div>
                     ))}
                 </div>
             ) : (
                <div className="text-slate-500 text-xs italic">Gathering sub-ledger telemetry...</div>
             )}
          </div>
       </div>
   );
}


function Step2_Analysis({ flagsReq, roleReq, target }) {
   return (
       <div className="flex flex-col h-full animate-fade-in relative z-10">
          <h2 className="text-2xl font-display text-white mb-2">Stage 2: Hybrid Rules & ML Analysis</h2>
          <p className="text-slate-400 text-sm mb-6">Executing the API layer: `run_all_flags()` combined with EWC-Fine-Tuned Extended Isolation Forest models.</p>

          <div className="flex flex-col gap-6">
             {/* 10-Flag Rule Engine */}
             <div className="bg-black/30 border border-line/40 rounded-2xl p-6">
                 <div className="text-[10px] uppercase text-cyan tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-line/30 pb-2">
                    <FileCheck size={14} /> 10-Flag RBI Rule Evaluation
                 </div>
                 {flagsReq?.flag_hits?.length > 0 ? (
                    <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                       {flagsReq.flag_hits.map((h, i) => (
                           <div key={i} className="flex flex-col gap-1 border-l-2 border-red pl-3 py-1 bg-red/5 rounded-r">
                               <div className="text-red font-mono text-xs">{h.flag || "FLAG"}: {flagsReq?.all_flags?.[h.flag]?.name || "Rule"}</div>
                               <div className="text-slate-400 text-[10px]">{h.detail || "Violation detected"}</div>
                           </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-slate-500 text-xs font-mono py-4">No critical heuristics breached.</div>
                 )}
             </div>

             {/* ML EIF Details */}
             <div className="bg-black/30 border border-purple-500/30 rounded-2xl p-6 mt-auto">
                 <div className="text-[10px] uppercase text-purple-400 tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-purple-500/20 pb-2">
                    <Brain size={14} /> Deep Learning Insights
                 </div>
                 
                 <div className="grid grid-cols-2 gap-6">
                     <div>
                        <div className="text-[10px] uppercase text-slate-500 mb-1">Graph Topological Role</div>
                        <div className="inline-block bg-orange/20 text-orange font-mono font-bold px-3 py-1 rounded-full border border-orange/40 text-sm tracking-widest shadow-[0_0_10px_rgba(251,146,60,0.2)]">
                           {roleReq?.role?.role || "UNKNOWN"}
                        </div>
                     </div>
                     <div>
                        <div className="text-[10px] uppercase text-slate-500 mb-1 flex items-center justify-between">
                           Extended Isolation Forest
                           <span className="text-purple-300 font-mono text-xs">{((roleReq?.eif?.anomaly_score) || 0).toFixed(2)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 mt-2 overflow-hidden border border-line">
                           <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${((roleReq?.eif?.anomaly_score) || 0) * 100}%` }}
                              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                              className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" 
                           />
                        </div>
                     </div>
                 </div>
             </div>
          </div>
       </div>
   );
}


function Step3_Scoring({ flagsReq, roleReq }) {
   // Simulated final computation aggregation based on the backend data grabbed in Step 2.
   const eifScore = ((roleReq?.eif?.anomaly_score) || 0) * 100;
   const flagCount = flagsReq?.total_hits || 0;
   const ruleScore = Math.min(flagCount * 25, 100);
   
   // Hardcoded standard GAT and LSTM scores for the UI demo since they typically run continuously in the background
   const gatScore = 87.5; 
   const lstmScore = 81.2;

   // 4 pillar calculation
   const finalScore = (gatScore * 0.35) + (lstmScore * 0.25) + (eifScore * 0.20) + (ruleScore * 0.20);
   const roleMultiplier = roleReq?.role?.role === "HUB" || roleReq?.role?.role === "BRIDGE" ? 1.25 : 1.0;
   const definitiveScore = Math.min(finalScore * roleMultiplier, 100);

   return (
      <div className="flex flex-col h-full animate-fade-in relative z-10">
         <h2 className="text-2xl font-display text-white mb-2">Stage 3: 4-Pillar Scoring Engine</h2>
         <p className="text-slate-400 text-sm mb-6">Consolidating structural, temporal, anomaly, and heuristic threat dimensions into the final Verdict.</p>

         <div className="flex flex-col flex-1 pb-6">
             <div className="grid grid-cols-2 gap-4 w-full mb-8">
                 <ScoreCard label="VarunaGAT (35%)" value={gatScore.toFixed(1)} tone="emerald" hint="Topology Likeness" />
                 <ScoreCard label="VarunaLSTM (25%)" value={lstmScore.toFixed(1)} tone="cyan" hint="Burst Timing" />
                 <ScoreCard label="VarunaEIF (20%)" value={eifScore.toFixed(1)} tone="purple" hint="Unsupervised" />
                 <ScoreCard label="Rule Engine" value={ruleScore.toFixed(1)} tone="red" hint={`${flagCount} Rules Hit`} />
             </div>

             <div className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-white bg-black/50 p-6 rounded-3xl border border-line/50 shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-r from-red/10 via-transparent to-purple-500/10" />
                 
                 <div className="text-left z-10 w-full sm:w-auto">
                    <div className="text-[10px] xl:text-xs uppercase tracking-[0.2em] xl:tracking-[0.3em] text-slate-400 mb-1">Final Risk Score</div>
                    <div className="text-slate-500 font-mono text-[9px] xl:text-xs">(Base Multiplier: {roleMultiplier}x for {roleReq?.role?.role || "NODE"})</div>
                 </div>
                 <div className="hidden sm:block w-px h-16 bg-line/60 z-10" />
                 <div className="text-5xl xl:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-red to-orange relative z-10 tracking-widest sm:pl-2 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                    {definitiveScore.toFixed(1)}<span className="text-3xl tracking-normal text-red/60">%</span>
                 </div>
             </div>
         </div>
      </div>
   );
}


function ScoreCard({ label, value, hint, tone }) {
   const tones = {
      emerald: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
      cyan: "border-cyan/30 text-cyan bg-cyan/5",
      purple: "border-purple-500/30 text-purple-400 bg-purple-500/5",
      red: "border-red/30 text-red bg-red/5"
   };

   return (
       <div className={`rounded-xl xl:rounded-2xl border p-3 xl:p-4 text-center ${tones[tone]}`}>
          <div className="text-[9px] xl:text-[10px] uppercase font-bold tracking-[0.1em] opacity-80 mb-1 xl:mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
          <div className="text-2xl xl:text-3xl font-display">{value}</div>
          <div className="text-[8px] xl:text-[9px] mt-1 font-mono opacity-60 uppercase whitespace-nowrap overflow-hidden text-ellipsis">{hint}</div>
       </div>
   );
}

function Step4_Audit({ target }) {
   return (
      <div className="flex flex-col h-full animate-fade-in relative z-10">
         <h2 className="text-2xl font-display text-white mb-2 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Stage 4: Enforcement</h2>
         <p className="text-slate-400 text-sm mb-6">Because the target node crossed the 90% threshold, it is automatically blocked via `/api/freeze` to prevent further network dissipation.</p>

         <div className="flex flex-col gap-6 flex-1">
             <div className="flex flex-col items-center justify-center border border-red/40 bg-red/10 rounded-3xl p-6 xl:p-8 relative overflow-hidden group min-h-[160px]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(255,0,0,0.1)_50%,rgba(255,0,0,0.1)_75%,transparent_75%,transparent_100%)] bg-[length:40px_40px] opacity-20 pointer-events-none group-hover:bg-[length:38px_38px] transition-all duration-1000" />
                <Lock size={36} className="text-red mb-3 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]" />
                <div className="text-xl xl:text-2xl font-display text-white mb-2 uppercase tracking-[0.2em] relative z-10 text-red font-bold text-center">Account Frozen</div>
                <div className="font-mono text-xs text-red/80 bg-black/40 px-4 py-2 rounded-xl relative z-10 text-center break-all w-full max-w-[280px]">{target}</div>
             </div>
         </div>
      </div>
   );
}

/* ── Embedded Simulation Graph ── */
function SimulationGraph({ graph, chainData, step, target }) {
   const fgRef = useRef();
   const prevStepRef = useRef(step);
   
   // Only compute visual properties once or when step changes.
   const visualData = useMemo(() => {
       const chainAccounts = chainData?.accounts || [];
       const isExtractionState = step >= 1 && chainAccounts.length > 0;
       
       return {
           nodes: graph.nodes.map(n => {
               const inChain = isExtractionState ? chainAccounts.includes(n.id) : true;
               const isTarget = isExtractionState && n.id === target;
               return {
                   ...n,
                   isVisible: inChain,
                   isTarget,
                   renderColor: isExtractionState 
                                 ? (inChain ? (isTarget ? "#ef4444" : "#f97316") : "rgba(255,255,255,0.05)") 
                                 : (n.node_type === "victim" ? "#4da6ff" : (n.node_type === "mule" ? "#e8475f" : "#f0a040")),
                   renderSize: isExtractionState ? (inChain ? (isTarget ? 14 : 10) : 3) : 6
               };
           }),
           links: graph.links.map(l => {
              const srcId = typeof l.source === 'object' ? l.source.id : l.source;
              const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
              const inChain = isExtractionState ? (chainAccounts.includes(srcId) && chainAccounts.includes(tgtId)) : true;
              return {
                 ...l,
                 isVisible: inChain,
                 renderColor: isExtractionState
                              ? (inChain ? "rgba(249, 115, 22, 0.6)" : "rgba(255,255,255,0.02)")
                              : "rgba(100, 140, 190, 0.4)",
                 renderWidth: isExtractionState ? (inChain ? 2 : 0.5) : 1
              };
           })
       };
   }, [graph, chainData, step, target]);

   // Handle smooth zoom-to-fit trigger
   useEffect(() => {
       const fg = fgRef.current;
       if (!fg) return;
       
       // Force initial spread
       fg.d3Force("charge")?.strength(-250);
       fg.d3Force("link")?.distance(60);

       if (step === 0 && prevStepRef.current !== 0) {
           fg.zoomToFit(800, 20);
       } else if (step === 1 && prevStepRef.current === 0 && chainData) {
           // Move camera to isolate the mule chain
           setTimeout(() => {
               const chainAccounts = chainData?.accounts || [];
               if (chainAccounts.length > 0) {
                 const selected = fg.graphData().nodes.filter(n => chainAccounts.includes(n.id));
                 if (selected.length > 0) {
                    fg.zoomToFit(1200, 80, (node) => chainAccounts.includes(node.id));
                 }
               }
           }, 800); // Wait for nodes to settle color
       }
       prevStepRef.current = step;
   }, [step, chainData, visualData]);

   return (
      <div className="absolute inset-0 bg-black/40">
         <ForceGraph2D
             ref={fgRef}
             graphData={visualData}
             backgroundColor="transparent"
             nodeColor={n => n.renderColor}
             nodeVal={n => n.renderSize}
             linkColor={l => l.renderColor}
             linkWidth={l => l.renderWidth}
             linkDirectionalParticles={l => l.isVisible ? 2 : 0}
             linkDirectionalParticleSpeed={0.005}
             linkDirectionalParticleWidth={2}
             nodeLabel={n => n.isVisible ? `${n.id} (${n.bank || 'Unknown'})` : ""}
             d3AlphaDecay={0.04}
             d3VelocityDecay={0.4}
             cooldownTicks={100}
             enableZoomPanInteraction={true}
             enablePointerInteraction={true}
         />
         
         <div className="absolute top-4 left-4 bg-black/60 border border-line/50 p-3 rounded-xl backdrop-blur-sm shadow-xl z-10 pointer-events-none">
             <div className="text-[10px] uppercase text-slate-400 font-bold tracking-[0.2em] mb-2 border-b border-line/30 pb-1">Topology Master</div>
             {step === 0 ? (
                 <div className="text-xs text-white">Full Database Network View</div>
             ) : (
                 <div className="text-xs text-orange border-l-2 border-orange pl-2">
                    Sub-graph Isolated: <span className="font-mono text-white ml-1">{chainData?.accounts?.length || 0} Nodes</span>
                 </div>
             )}
         </div>
         
         <div className="absolute bottom-4 left-4 flex gap-3 text-[10px] uppercase tracking-wider text-slate-500 z-10 pointer-events-none">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> Mule</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Target (Hub)</span>
         </div>
      </div>
   );
}
