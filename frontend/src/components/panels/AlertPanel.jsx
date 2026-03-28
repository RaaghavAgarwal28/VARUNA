import { formatCurrency } from "../../lib/format";

export function AlertPanel({ analysis, onFreeze, backendLive }) {
  if (!analysis) {
    return (
      <div className="panel p-5">
        <div className="panel-heading">Alert Panel</div>
        <div className="mt-3 text-sm text-white/40">Select an account in the graph to inspect its chain.</div>
      </div>
    );
  }

  const risk = analysis.risk || {};
  const txCount = analysis.chain?.transactions?.length || 0;

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">Alert Panel</div>
          <div className="text-sm text-white/40">Live account investigation and freeze action</div>
        </div>
        <div className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red">
          {backendLive ? "Live API" : "Demo Mode"}
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-white/30">Flagged Account</div>
        <div className="mt-2 font-display text-2xl text-white">{analysis.account_id}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Metric label="Risk Score" value={risk.risk_score || "-"} />
          <Metric label="Chain Confidence" value={risk.chain_confidence || "-"} />
          <Metric label="Combined Score" value={analysis.combined_score || "-"} />
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-white/30">Why Triggered</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(analysis.velocity_rule_hits || []).map((item) => (
            <span key={item} className="rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs text-orange">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-white/30">Chain Path</div>
        <div className="mt-2 text-sm leading-7 text-white/50">
          {(analysis.chain?.accounts || []).join(" -> ")}
        </div>
        <div className="mt-3 text-sm text-white/40">
          {txCount} suspicious transfers in extracted 3-hop subgraph
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric label="Graph Model" value={analysis.graph_model?.model || "-"} />
        <Metric label="Temporal Model" value={analysis.temporal_model?.model || "-"} />
      </div>

      <button
        onClick={() => onFreeze(analysis.account_id)}
        className="mt-4 w-full rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#FF4500] transition hover:bg-[#FF4500]/20"
      >
        Freeze Selected Account
      </button>

      <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/30">Intercept Preview</div>
      <div className="mt-2 text-sm text-white/50">
        Projected recoverable amount: {formatCurrency(analysis.intercept_preview?.projected_recoverable_amount || 0)}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">{label}</div>
      <div className="mt-2 font-display text-xl text-white">{value}</div>
    </div>
  );
}

