export function SentinelPanel({ scores }) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">VARUNA Sentinel</div>
        <div className="text-sm text-slate-400">
          Rule-enhanced AI-style scoring with a clean path to GAT + LSTM
        </div>
      </div>
      <div className="space-y-3">
        {scores.slice(0, 6).map((score) => (
          <div key={score.account_id} className="rounded-2xl border border-line/70 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-white">{score.account_id}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{score.indicators.join(" · ")}</div>
              </div>
              <div className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-sm font-semibold text-red">
                {score.risk_score}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricMini label="Chain Confidence" value={score.chain_confidence} />
              <MetricMini label="Human Coordination" value={score.human_coordination_score} />
              <MetricMini label="Dissipation Risk" value={score.dissipation_risk} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricMini({ label, value }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-slate-950/30 p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 font-display text-xl text-white">{value}</div>
    </div>
  );
}

