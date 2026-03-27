import { formatCurrency, formatSeconds } from "../../lib/format";

export function InterceptPanel({ intercept }) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">VARUNA Intercept</div>
          <div className="text-sm text-slate-400">Cross-bank freeze orchestration simulation</div>
        </div>
        <div className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan">
          {intercept.freeze_coverage_ratio}% funds covered
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {intercept.frozen_accounts.map((action) => (
          <div key={action.account_id} className="rounded-2xl border border-line/70 bg-white/[0.02] p-4">
            <div className="mb-1 font-semibold text-white">{action.account_id}</div>
            <div className="text-sm text-slate-400">{action.bank}</div>
            <div className="mt-3 font-display text-2xl text-cyan">{formatCurrency(action.amount_frozen)}</div>
            <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
              <span>{action.status}</span>
              <span>{formatSeconds(action.eta_seconds)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-3xl border border-orange/30 bg-orange/10 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-display text-lg text-orange">Simulate 3-minute delay</div>
          <div className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red">
            +{formatCurrency(intercept.simulate_3_minute_delay.additional_loss)} loss
          </div>
        </div>
        <div className="text-sm text-slate-300">{intercept.simulate_3_minute_delay.narrative}</div>
        <div className="mt-3 text-sm text-slate-400">
          Recoverable after delay:{" "}
          <span className="font-semibold text-white">{formatCurrency(intercept.simulate_3_minute_delay.recoverable_after_delay)}</span>
        </div>
      </div>
    </div>
  );
}

