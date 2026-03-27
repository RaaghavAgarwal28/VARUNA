import { formatCurrency } from "../../lib/format";

const threatStyles = {
  Severe: "border-red/30 bg-red/10 text-red",
  High: "border-orange/30 bg-orange/10 text-orange",
  Elevated: "border-cyan/30 bg-cyan/10 text-cyan",
};

export function BankOpsPanel({ bankIntel }) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">Bank-Wise Anomaly Command</div>
        <div className="text-sm text-slate-400">
          Every bank in the chain gets its own operational anomaly snapshot
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {bankIntel.banks.map((bank) => (
          <div key={bank.bank} className="rounded-3xl border border-line/70 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-xl text-white">{bank.bank}</div>
                <div className="text-sm text-slate-400">
                  {bank.city}, {bank.state}
                </div>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${threatStyles[bank.threatLevel]}`}>
                {bank.threatLevel}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Suspicious Accounts" value={bank.suspiciousAccounts} />
              <MiniMetric label="Frozen" value={bank.frozenAccounts} />
              <MiniMetric label="Exposure" value={formatCurrency(bank.totalExposure)} />
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Linked States</div>
              <div className="flex flex-wrap gap-2">
                {bank.linkedStates.map((state) => (
                  <span key={state} className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                    {state}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Observed Anomalies</div>
              <div className="space-y-2">
                {bank.anomalies.map((anomaly) => (
                  <div key={anomaly} className="rounded-2xl border border-line/60 bg-slate-950/30 px-3 py-2 text-sm text-slate-200">
                    {anomaly}
                  </div>
                ))}
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

