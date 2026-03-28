import { formatCurrency } from "../../lib/format";

const threatStyles = {
  Severe: "border-red/30 bg-red/10 text-red",
  High: "border-orange/30 bg-orange/10 text-orange",
  Elevated: "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]",
};

export function BankOpsPanel({ bankIntel }) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">Bank-Wise Anomaly Command</div>
        <div className="text-sm text-white/40">
          Every bank in the chain gets its own operational anomaly snapshot
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {bankIntel.banks.map((bank) => (
          <div key={bank.bank} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-xl text-white">{bank.bank}</div>
                <div className="text-sm text-white/40">
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
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/30">Linked States</div>
              <div className="flex flex-wrap gap-2">
                {bank.linkedStates.map((state) => (
                  <span key={state} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
                    {state}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/30">Observed Anomalies</div>
              <div className="space-y-2">
                {bank.anomalies.map((anomaly) => (
                  <div key={anomaly} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">{label}</div>
      <div className="mt-2 font-display text-lg text-white">{value}</div>
    </div>
  );
}

