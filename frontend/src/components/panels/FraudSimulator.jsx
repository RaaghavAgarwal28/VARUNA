import React, { useState, useRef, useEffect } from "react";
import { Zap, ChevronRight } from "lucide-react";
import { getApiBase } from "../../lib/api";

const f4  = (n, d = 4) => Number(n).toFixed(d);
const hex = (s) => s >= 0.75 ? "#ef4444" : s >= 0.45 ? "#facc15" : "#CAFF33";
const tc  = (s) => s >= 0.75 ? "text-red-400" : s >= 0.45 ? "text-yellow-400" : "text-[#CAFF33]";
const bg  = (s) =>
  s >= 0.75 ? "bg-red-500/[0.04] border-red-500/20"
  : s >= 0.45 ? "bg-yellow-400/[0.04] border-yellow-400/20"
  : "bg-[#CAFF33]/[0.04] border-[#CAFF33]/20";
const dc  = (d) =>
  d === "BLOCK"  ? "bg-red-500/10 border border-red-500/20 text-red-400"
  : d === "REVIEW" ? "bg-yellow-400/10 border border-yellow-400/20 text-yellow-400"
  : "bg-[#CAFF33]/10 border border-[#CAFF33]/20 text-[#CAFF33]";

const Card = ({ children, className = "" }) => (
  <div className={`relative border border-white/[0.09] rounded-[1.5rem] bg-[#0a0a0a] overflow-hidden ${className}`}
    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)" }}>
    {children}
  </div>
);
const Eyebrow = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 mb-2">{children}</p>
);
const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${className}`}>{children}</span>
);
const Row = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 border-b border-white/[0.06] last:border-0">
    <span className="text-[11px] text-white/70 uppercase tracking-widest font-semibold">{label}</span>
    <span className="text-sm font-bold text-white">{value}</span>
  </div>
);
function Bar({ label, value, max = 1, color = "#CAFF33" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">{label}</span>
        <span className="text-xs font-black font-mono" style={{ color }}>{f4(value, 2)}</span>
      </div>
      <div className="relative h-[3px] w-full bg-white/[0.07] rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 12px ${color}55` }} />
      </div>
    </div>
  );
}
function Gauge({ score, label }) {
  const r = 40, cx = 56, cy = 60, circ = 2 * Math.PI * r;
  const dash = Math.min(1, score) * circ * 0.75;
  const color = hex(score);
  return (
    <div className="flex flex-col items-center">
      <svg width={112} height={90} viewBox="0 0 112 82">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${circ * 0.75} ${circ}`} transform={`rotate(-135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
          strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} transform={`rotate(-135 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 10px ${color}aa)`, transition: "stroke-dasharray 1s ease" }} />
        <text x={cx} y={cx + 3} textAnchor="middle" fill={color} fontSize={14}
          fontWeight={900} fontFamily="var(--font-geist-mono)">{f4(score, 2)}</text>
      </svg>
      <span className="text-[9px] text-white/65 uppercase tracking-[0.22em] font-bold -mt-1">{label}</span>
    </div>
  );
}

function LiveBadge({ loading, error }) {
  if (loading) return <span className="text-[9px] text-white/70 animate-pulse font-mono">fetching…</span>;
  if (error)   return <span className="text-[9px] text-yellow-400/70 font-mono">⚠ unreachable</span>;
  return (
    <span className="flex items-center gap-1.5 text-[9px] text-[#CAFF33]/70 font-mono font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-[#CAFF33]" style={{ boxShadow: "0 0 6px #CAFF33" }} />
      live
    </span>
  );
}

function Canvas({ liveNodes }) {
  const ref  = useRef(null);
  const anim = useRef(null);
  const pts = useRef([]);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const W = c.width, H = c.height;
    const source = liveNodes && liveNodes.length > 0
      ? liveNodes.slice(0, 60)
      : Array.from({ length: 50 }, (_, i) => ({
          id: `acc_${i}`, is_fraud: i % 9 === 0 ? 1 : 0,
          risk: i % 9 === 0 ? 0.8 : Math.random() * 0.4, ring: i % 15 === 0,
        }));

    pts.current = source.map(n => ({
      x: 30 + Math.random() * (W - 60), y: 20 + Math.random() * (H - 40),
      vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.14,
      r: n.ring ? 5.5 : n.is_fraud ? 4.5 : 2.5,
      color: n.ring ? "#f97316" : n.is_fraud ? "#ef4444" : n.risk > 0.5 ? "#facc15" : "#CAFF33",
      hot: !!(n.ring || n.is_fraud),
    }));

    let t = 0;
    const draw = () => {
      const ctx = c.getContext("2d"); if (!ctx) return;
      ctx.fillStyle = "#080808"; ctx.fillRect(0, 0, W, H); t += 0.006;
      pts.current.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 15 || p.x > W - 15) p.vx *= -1;
        if (p.y < 10 || p.y > H - 10) p.vy *= -1;
      });
      for (let i = 0; i < pts.current.length; i++) {
        for (let j = i + 1; j < pts.current.length; j++) {
          const a = pts.current[i], b = pts.current[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 85) {
            const al = (1 - d / 85) * 0.09;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = (a.hot || b.hot) ? `rgba(239,68,68,${al})` : `rgba(202,255,51,${al * 0.45})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      pts.current.forEach((p, i) => {
        if (p.hot) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239,68,68,${0.05 * pulse})`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color;
        ctx.shadowBlur = p.hot ? 12 : 4; ctx.fill(); ctx.shadowBlur = 0;
      });
      anim.current = requestAnimationFrame(draw);
    };
    anim.current = requestAnimationFrame(draw);
    return () => { if (anim.current) cancelAnimationFrame(anim.current); };
  }, [liveNodes]);

  return <canvas ref={ref} width={500} height={240} className="w-full h-full rounded-2xl" />;
}

function PipeStep({ n, label, active, done, tag }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${active ? "bg-[#CAFF33]/[0.09] border border-[#CAFF33]/20" : "border border-transparent"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-all ${done ? "bg-[#CAFF33] text-black" : active ? "bg-[#CAFF33] text-black" : "bg-white/[0.06] text-white/70 border border-white/[0.1]"}`}>
        {done ? "✓" : n}
      </div>
      <span className={`text-[11px] flex-1 transition-colors leading-tight font-semibold ${active ? "text-[#CAFF33]" : done ? "text-[#CAFF33]/50" : "text-white/60"}`}>{label}</span>
      {tag && <span className="text-[8px] font-black uppercase tracking-widest text-white/60 border border-white/[0.15] px-1.5 py-0.5 rounded-full">{tag}</span>}
    </div>
  );
}

function Field({ label, k, form, setForm }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{label}</label>
      <input value={form[k]} onChange={e => setForm((f) => ({ ...f, [k]: e.target.value }))}
        className="w-full bg-white/[0.04] border border-white/[0.1] hover:border-white/[0.18] focus:border-[#CAFF33]/40 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-white/50 focus:outline-none transition-colors" />
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/[0.06] mb-4">
      <p className="text-xs text-red-300 leading-relaxed font-mono">{message}</p>
    </div>
  );
}

const PIPE = [
  "Validate","Persist Txn","Persist Identity","Identity Forensic",
  "Update Aggregates","Behavioral Feats","Graph Context",
  "EIF ‖ GNN","Risk Fusion","Log Predictions",
  "Decision Policy","Commit DB","Return Verdict","Blockchain Async",
];

export function FraudSimulator() {
  const [form, setForm] = useState({
    sid: "1553",
    did: "899",
    amt: "2077",
    ccy: "INR",
    ip: "49.204.11.92",
    ja3: "771,4866-4867-4865,...",
    dev: "device_8s7df6",
    nb: "4",
    hd: "0.47",
  });
  const [step,    setStep]    = useState(0);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [tab,     setTab]     = useState("Overview");
  const [showPipeline, setShowPipeline] = useState(false);

  const run = async () => {
    setResult(null);
    setApiError(null);
    setLoading(true);
    setStep(0);
    setShowPipeline(true);

    const dl = [80,80,80,80,80,80,80,220,80,80,80,80,300,120];
    for (let i = 0; i < 14; i++) { setStep(i + 1); await new Promise(r => setTimeout(r, dl[i])); }

    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const localTimestamp =
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const res = await fetch(`${getApiBase()}/simulate-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-JA3-Fingerprint": form.ja3,
        },
        body: JSON.stringify({
          transactionId: crypto.randomUUID(),
          sourceAccount:  form.sid,
          targetAccount:  form.did,
          amount:         Number(form.amt),
          timestamp:      localTimestamp,
        }),
      });

      if (!res.ok) {
        let errText = `HTTP ${res.status}`;
        try { const body = await res.json(); errText = JSON.stringify(body); } catch {}
        setApiError(`Backend returned error: ${errText}`);
        setStep(15);
        setLoading(false);
        return;
      }

      const data = await res.json();

      const mapped = {
        decision:       data.decision                    ?? "REVIEW",
        riskScore:      data.riskScore                   ?? 0,
        riskLevel:      data.riskLevel                   ?? "UNKNOWN",
        suspectedFraud: data.suspectedFraud              ?? false,
        gnnScore:       data.modelScores?.gnn            ?? 0,
        eifScore:       data.modelScores?.eif            ?? 0,
        eifConf:        data.modelScores?.eifConfidence  ?? 0,
        gnnConf:        data.modelScores?.confidence     ?? 0,
        behaviorScore:  data.modelScores?.behavior       ?? 0,
        graphScore:     data.modelScores?.graph          ?? 0,
        eifExplanation: data.modelScores?.eifExplanation ?? "",
        shapValues:     data.modelScores?.eifTopFactors  ?? {},
        clusterId:      data.fraudCluster?.clusterId     ?? 0,
        clusterSize:    data.fraudCluster?.clusterSize   ?? 0,
        clusterRisk:    data.fraudCluster?.clusterRiskScore ?? 0,
        embeddingNorm:  data.embeddingNorm               ?? 0,
        networkMetrics: {
          suspiciousNeighbors: data.networkMetrics?.suspiciousNeighbors ?? 0,
          centralityScore:     data.networkMetrics?.centralityScore     ?? 0,
          transactionLoops:    data.networkMetrics?.transactionLoops    ?? false,
          sharedDevices:       data.networkMetrics?.sharedDevices       ?? 0,
          sharedIPs:           data.networkMetrics?.sharedIPs           ?? 0,
        },
        muleRing:    data.muleRingDetection ?? { isMuleRingMember: false },
        riskFactors: data.riskFactors ?? [],
        ja3: {
          isNewDevice: data.ja3Security?.isNewDevice ?? false,
          isNewJa3:    data.ja3Security?.isNewJa3    ?? false,
          reuse:       data.ja3Security?.velocity    ?? 0,
          fanout:      data.ja3Security?.fanout      ?? 0,
          ja3Risk:     data.ja3Security?.ja3Risk     ?? 0,
        },
      };
      setResult(mapped);
    } catch (e) {
      setApiError(`Network error: ${e?.message ?? "Backend not reachable"}`);
    }
    setStep(15);
    setLoading(false);
  };

  const fusionComponents = result ? [
    { w: 0.40, v: result.gnnScore,      label: "GNN",      color: "#CAFF33"  },
    { w: 0.20, v: result.eifScore,      label: "EIF",      color: "#a855f7"  },
    { w: 0.25, v: result.behaviorScore, label: "Behavior", color: "#3b82f6"  },
    { w: 0.10, v: result.graphScore,    label: "Graph",    color: "#facc15"  },
    { w: 0.05, v: result.ja3?.ja3Risk ?? 0, label: "JA3", color: "#f97316"  },
  ] : [];

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[270px_1fr_210px] lg:gap-5 lg:h-full">
      {/* Input Card */}
      <Card className="flex flex-col">
        <div className="p-5 sm:p-6 border-b border-white/[0.12]">
          <Eyebrow>Input</Eyebrow>
          <p className="text-lg font-bold text-white">Transaction</p>
        </div>
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          <div className="space-y-3">
            <div className="px-3 py-2 rounded-lg bg-[#CAFF33]/[0.04] border border-[#CAFF33]/10">
              <p className="text-[9px] text-[#CAFF33]/70 leading-relaxed">
                Account IDs must be numeric (e.g. "1553") — they map to node IDs in the graph.
              </p>
            </div>
            <Field label="Source Account (numeric)"      k="sid" form={form} setForm={setForm} />
            <Field label="Destination Account (numeric)" k="did" form={form} setForm={setForm} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount"   k="amt" form={form} setForm={setForm} />
              <Field label="Currency" k="ccy" form={form} setForm={setForm} />
            </div>
          </div>
          <div className="pt-4 border-t border-white/[0.04] space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/65 mb-1">Identity (passed as headers)</p>
            <Field label="IP Address"      k="ip"  form={form} setForm={setForm} />
            <Field label="JA3 Fingerprint" k="ja3" form={form} setForm={setForm} />
            <Field label="Device ID"       k="dev" form={form} setForm={setForm} />
          </div>
          <div className="pt-4 border-t border-white/[0.04] space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/65 mb-1">Graph Context (display only)</p>
            <Field label="Suspicious Neighbours" k="nb" form={form} setForm={setForm} />
            <Field label="2-Hop Fraud Density"   k="hd" form={form} setForm={setForm} />
          </div>
        </div>
        <div className="p-4 sm:p-5 border-t border-white/[0.04]">
          <button onClick={run} disabled={loading}
            className="w-full py-3.5 bg-[#CAFF33] hover:bg-[#d4ff55] active:scale-[0.99] disabled:opacity-40 text-black font-bold rounded-xl text-[11px] uppercase tracking-[0.15em] transition-all">
            {loading ? "Processing…" : "Score Transaction"}
          </button>
        </div>
      </Card>

      {/* Results */}
      <div className="flex flex-col gap-4 min-w-0">
        {apiError && <ErrorBanner message={apiError} />}

        {result ? (
          <>
            <Card className={`p-5 sm:p-8 border ${bg(result.riskScore)}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <Eyebrow>Risk Verdict</Eyebrow>
                  <p className={`text-4xl sm:text-[3.25rem] font-black uppercase tracking-tight leading-none ${tc(result.riskScore)}`}
                    style={{ textShadow: `0 0 60px ${hex(result.riskScore)}33` }}>
                    {result.decision}
                  </p>
                  <p className="text-xs text-white/70 mt-2">
                    Risk level: <span className={tc(result.riskScore)}>{result.riskLevel}</span>
                    {result.suspectedFraud && <span className="ml-3 text-red-400">● Suspected fraud</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 sm:gap-10 items-end">
                  {([
                    ["Fusion",    result.riskScore],
                    ["GNN",       result.gnnScore],
                    ["EIF",       result.eifScore],
                    ["Behavior",  result.behaviorScore],
                  ]).map(([l, v]) => (
                    <div key={l} className="text-right">
                      <p className="text-[9px] text-white/65 uppercase tracking-widest mb-1">{l}</p>
                      <p className={`text-xl sm:text-2xl font-black font-mono ${tc(v)}`}>{f4(v, 3)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ["GNN",      result.gnnScore,      `Cluster #${result.clusterId} · emb ${f4(result.embeddingNorm, 2)}`],
                ["EIF",      result.eifScore,       `Conf ${f4(result.eifConf, 3)}`],
                ["Behavior", result.behaviorScore,  "velocity + burst + deviation"],
                ["Fusion",   result.riskScore,      "0.40·GNN+0.20·EIF+0.25·B+0.10·G+0.05·J"],
              ]).map(([l, v, s]) => (
                <Card key={l} className="p-4 sm:p-6 flex flex-col items-center gap-2">
                  <Gauge score={v} label={l} />
                  <p className="text-[9px] text-white/65 text-center leading-relaxed">{s}</p>
                </Card>
              ))}
            </div>

            <Card className="p-4 sm:p-6 flex-1">
              <div className="flex gap-1.5 mb-6 pb-5 border-b border-white/[0.05] flex-wrap">
                {["Overview","Behavioral","Structural","Identity","Fusion"].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-[#CAFF33] text-black" : "text-white/75 hover:text-white"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {tab === "Overview" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">Score Breakdown</p>
                    <Bar label="GNN — structural graph signal"  value={result.gnnScore}      color={hex(result.gnnScore)} />
                    <Bar label="EIF — behavioral anomaly"       value={result.eifScore}      color={hex(result.eifScore)} />
                    <Bar label="Behavior — velocity + burst"    value={result.behaviorScore} color="#3b82f6" />
                    <Bar label="Graph — neighbour connectivity" value={result.graphScore}    color="#facc15" />
                    <Bar label="Fusion — final risk"            value={result.riskScore}     color={hex(result.riskScore)} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-4">Risk Signals (from GNN)</p>
                    <div className="space-y-2">
                      {result.riskFactors.length > 0
                        ? result.riskFactors.map((f, i) => (
                            <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-sm text-white/75 leading-relaxed">
                              <span className="text-red-500/60 shrink-0 mt-0.5 text-xs">▲</span>{f}
                            </div>
                          ))
                        : <p className="text-sm text-white/70">No risk signals detected.</p>}
                    </div>
                    {result.eifExplanation && (
                      <div className="mt-4 p-4 rounded-xl bg-purple-500/[0.04] border border-purple-500/15">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400/70 mb-2">EIF Explanation</p>
                        <p className="text-xs text-white/75 leading-relaxed">{result.eifExplanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === "Behavioral" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-3">EIF Score</p>
                    <p className={`text-5xl sm:text-6xl font-black font-mono mb-3 leading-none ${tc(result.eifScore)}`}>{f4(result.eifScore, 4)}</p>
                    <p className="text-sm text-white/70 mb-1">
                      EIF Confidence: <span className="text-white/80">{f4(result.eifConf, 4)}</span>
                    </p>
                    <p className="text-sm text-white/70">
                      GNN Confidence: <span className="text-white/80">{f4(result.gnnConf, 4)}</span>
                    </p>
                    {result.eifExplanation && (
                      <p className="mt-4 text-xs text-white/65 italic leading-relaxed">"{result.eifExplanation}"</p>
                    )}
                  </div>
                  <div className="space-y-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">EIF Top Factors (SHAP)</p>
                    {Object.keys(result.shapValues).length > 0
                      ? Object.entries(result.shapValues).map(([k, v]) =>
                          <Bar key={k} label={k} value={Math.abs(v)} max={1} color="#a855f7" />
                        )
                      : <p className="text-sm text-white/70">No SHAP factors returned.</p>}
                    <div className="pt-4 border-t border-white/[0.04]">
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-3">Behavior Score</p>
                      <p className={`text-3xl font-black font-mono ${tc(result.behaviorScore)}`}>{f4(result.behaviorScore, 4)}</p>
                      <p className="text-[10px] text-white/65 mt-1">velocity 0.3 + burst 0.5 + deviation 0.2</p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "Structural" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-3">GNN Score</p>
                    <p className={`text-5xl sm:text-6xl font-black font-mono mb-6 leading-none ${tc(result.gnnScore)}`}>{f4(result.gnnScore, 4)}</p>
                    <div>
                      {([
                        ["Fraud Cluster",    `#${result.clusterId}`],
                        ["Cluster Size",     String(result.clusterSize)],
                        ["Cluster Risk",     f4(result.clusterRisk, 4)],
                        ["Embedding Norm",   f4(result.embeddingNorm, 4)],
                        ["Centrality",       f4(result.networkMetrics.centralityScore ?? 0, 6)],
                        ["Susp. Neighbours", String(result.networkMetrics.suspiciousNeighbors ?? 0)],
                        ["Shared Devices",   String(result.networkMetrics.sharedDevices ?? 0)],
                        ["Txn Loops",        result.networkMetrics.transactionLoops ? "YES" : "NO"],
                      ]).map(([k, v]) => <Row key={k} label={k} value={v} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-4">Ring Membership</p>
                    <div className={`p-5 sm:p-6 rounded-2xl border ${result.muleRing.isMuleRingMember ? "bg-red-500/[0.03] border-red-500/15" : "bg-[#CAFF33]/[0.03] border-[#CAFF33]/15"}`}>
                      <p className={`text-2xl font-black mb-5 ${result.muleRing.isMuleRingMember ? "text-red-400" : "text-[#CAFF33]"}`}>
                        {result.muleRing.isMuleRingMember ? "RING MEMBER" : "NOT IN RING"}
                      </p>
                      {result.muleRing.isMuleRingMember && (
                        <div>
                          {([
                            ["Shape",  result.muleRing.ringShape   ?? "—"],
                            ["Size",   String(result.muleRing.ringSize ?? "—")],
                            ["Role",   result.muleRing.role        ?? "—"],
                            ["Hub",    result.muleRing.hubAccount  ?? "—"],
                          ]).map(([k, v]) => <Row key={k} label={k} value={v} />)}
                          {result.muleRing.ringAccounts?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-white/65 mb-2">Ring Members</p>
                              <div className="flex flex-wrap gap-1.5">
                                {result.muleRing.ringAccounts.map((a, i) => (
                                  <span key={a} className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${i === 0 ? "bg-red-500/10 border-red-500/15 text-red-400" : "border-white/[0.15] text-white/75"}`}>{a}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === "Identity" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { l: "JA3 Velocity",  v: result.ja3.reuse,   w: 5 },
                      { l: "JA3 Risk",      v: result.ja3.ja3Risk, w: 0.5, fmt: (x) => f4(x, 3) },
                      { l: "JA3 Fanout",    v: result.ja3.fanout,  w: 3 },
                    ].map(({ l, v, w, fmt }) => (
                      <Card key={l} className="p-5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-3">{l}</p>
                        <p className={`text-4xl font-black font-mono mb-4 ${(v ?? 0) > w ? "text-red-400" : "text-[#CAFF33]"}`}>
                           {fmt ? fmt(v ?? 0) : (v ?? 0)}
                        </p>
                        <Bar label="signal" value={Math.min(1, (v ?? 0) / 10)} color={(v ?? 0) > w ? "#ef4444" : "#CAFF33"} />
                      </Card>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 sm:gap-8 p-5 rounded-xl border border-white/[0.05]">
                    {([["New Device", result.ja3.isNewDevice], ["New JA3", result.ja3.isNewJa3]]).map(([l, v]) => (
                      <div key={l} className="flex gap-3 items-center">
                        <span className="text-xs text-white/75">{l}</span>
                        <Pill className={v ? "bg-yellow-400/10 border border-yellow-400/20 text-yellow-400" : "bg-[#CAFF33]/10 border border-[#CAFF33]/20 text-[#CAFF33]"}>{v ? "YES" : "NO"}</Pill>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/65">Full identity forensics (JA3/device/IP analysis) runs in the JA3 security microservice — Step 4 of the pipeline.</p>
                </div>
              )}

              {tab === "Fusion" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-4">Formula (Spring Boot · combineRiskSignals)</p>
                    <div className="p-5 rounded-2xl bg-black/50 border border-white/[0.05] font-mono space-y-2.5">
                      <p className="text-[10px] text-white/70 mb-3 font-mono font-semibold">finalRisk =</p>
                      {fusionComponents.map(({ w, v, label, color }) => (
                        <p key={label} className="text-sm">
                          <span className="font-bold" style={{ color }}>{w}</span>
                          <span className="text-white/70"> × {label} ({f4(v, 3)})</span>
                          <span className="text-white/60"> = </span>
                          <span className="font-bold" style={{ color }}>{f4(w * v, 4)}</span>
                        </p>
                      ))}
                      <div className="border-t border-white/[0.06] pt-3">
                        <span className={`text-2xl font-black ${tc(result.riskScore)}`}>{f4(result.riskScore, 4)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 mb-4">Decision Policy (actual thresholds)</p>
                    <div className="space-y-2">
                      {([
                        ["0 – 0.45",    "APPROVE", 0.2 ],
                        ["0.45 – 0.75", "REVIEW",  0.55],
                        ["0.75 – 1.00", "BLOCK",   0.9 ],
                      ]).map(([range, dec]) => (
                        <div key={range} className={`flex justify-between items-center p-4 rounded-xl border ${result.decision === dec ? bg(dec === "BLOCK" ? 0.9 : dec === "REVIEW" ? 0.55 : 0.1) : "border-white/[0.04]"}`}>
                          <span className="text-sm text-white/75 font-mono">{range}</span>
                          <Pill className={dc(dec)}>{dec}</Pill>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/65 mt-4 leading-relaxed">Decision policy runs in Spring Boot — not the ML layer.</p>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : (
          !apiError && (
            <Card className="flex flex-col items-center justify-center flex-1 gap-5 min-h-[300px] sm:min-h-[460px]">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full border border-white/[0.04]" />
                <div className="absolute w-20 h-20 rounded-full border border-white/[0.05]" />
                <div className="w-12 h-12 rounded-full border border-white/[0.07] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white/60" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-lg font-bold text-white/85">Ready to Score</p>
                <p className="text-sm text-white/70">Configure a transaction and press Score</p>
                <p className="text-xs text-white/55 mt-2 font-mono">14-step pipeline · EIF ‖ GNN parallel · Blockchain async</p>
              </div>
            </Card>
          )
        )}
      </div>

      {/* Pipeline — collapsible on mobile, always visible on lg */}
      <div className="lg:block">
        <button
          onClick={() => setShowPipeline(p => !p)}
          className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/[0.09] bg-[#0a0a0a] mb-2"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/65">Pipeline</span>
          <ChevronRight className={`w-4 h-4 text-white/65 transition-transform ${showPipeline ? "rotate-90" : ""}`} />
        </button>
        <Card className={`flex-col overflow-y-auto ${showPipeline ? "flex" : "hidden lg:flex"}`}>
          <div className="p-5 border-b border-white/[0.04] hidden lg:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/65">Pipeline</p>
          </div>
          <div className="p-3 flex flex-col gap-0.5 flex-1">
            {PIPE.map((label, i) => (
              <PipeStep key={i} n={i + 1} label={label}
                active={step === i + 1} done={step > i + 1}
                tag={i === 7 ? "∥" : i === 13 ? "async" : undefined} />
            ))}
          </div>
          {step === 15 && (
            <div className={`m-3 p-3.5 rounded-xl border ${apiError ? "bg-red-500/[0.07] border-red-500/15" : "bg-[#CAFF33]/[0.07] border-[#CAFF33]/15"}`}>
              <p className={`text-[11px] font-bold ${apiError ? "text-red-400" : "text-[#CAFF33]"}`}>
                {apiError ? "✗ Pipeline error — see details" : "✓ All 14 steps complete"}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
