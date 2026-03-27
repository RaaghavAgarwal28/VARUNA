import { formatCurrency } from "../../lib/format";

const threatTone = {
  Severe: "border-red/30 bg-red/10 text-red",
  High: "border-orange/30 bg-orange/10 text-orange",
  Elevated: "border-cyan/30 bg-cyan/10 text-cyan",
};

export function StatesSection({ states }) {
  return (
    <div className="panel p-5">
      <div className="mb-5">
        <div className="panel-heading">States</div>
        <div className="text-sm text-slate-400">
          State-wise bifurcation of impacted banks, suspicious accounts, and anomaly signatures
        </div>
      </div>

      <div className="space-y-4">
        {states.map((state) => (
          <div key={state.state} className="rounded-[28px] border border-line/70 bg-white/[0.02] p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-display text-2xl text-white">{state.state}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {state.banks.length} linked banks in this fraud spread
                </div>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${threatTone[state.threatLevel]}`}>
                {state.threatLevel}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MiniMetric label="Exposure" value={formatCurrency(state.totalExposure)} />
              <MiniMetric label="Suspicious Accounts" value={state.suspiciousAccounts} />
              <MiniMetric label="Frozen Accounts" value={state.frozenAccounts} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Banks In State View</div>
                <div className="flex flex-wrap gap-2">
                  {state.banks.map((bank) => (
                    <span key={bank} className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                      {bank}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Anomalies</div>
                <div className="space-y-2">
                  {state.anomalies.map((anomaly) => (
                    <div key={anomaly} className="rounded-2xl border border-line/60 bg-slate-950/30 px-3 py-2 text-sm text-slate-200">
                      {anomaly}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-slate-950/30 p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 font-display text-lg text-white">{value}</div>
    </div>
  );
}

