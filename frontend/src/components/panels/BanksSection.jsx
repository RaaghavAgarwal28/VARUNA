import { formatCurrency } from "../../lib/format";

const threatStyles = {
  Severe: "border-red/30 bg-red/10 text-red",
  High: "border-orange/30 bg-orange/10 text-orange",
  Elevated: "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]",
};

export function BanksSection({ banks }) {
  return (
    <div className="panel p-5">
      <div className="mb-5">
        <div className="panel-heading">Banks</div>
        <div className="text-sm text-white/40">
          Bank-wise subsections with anomaly ownership, exposure, and linked state spread
        </div>
      </div>

      <div className="space-y-4">
        {banks.map((bank) => (
          <div key={bank.bank} className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-display text-2xl text-white">{bank.bank}</div>
                <div className="mt-1 text-sm text-white/40">
                  {bank.city}, {bank.state}
                </div>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${threatStyles[bank.threatLevel]}`}>
                {bank.threatLevel}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <MiniMetric label="Exposure" value={formatCurrency(bank.totalExposure)} />
              <MiniMetric label="Suspicious Accounts" value={bank.suspiciousAccounts} />
              <MiniMetric label="Frozen Accounts" value={bank.frozenAccounts} />
              <MiniMetric label="Predicted Accounts" value={bank.predictedAccounts} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/30">Linked States</div>
                <div className="flex flex-wrap gap-2">
                  {bank.linkedStates.map((state) => (
                    <span key={state} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
                      {state}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/30">Bank Anomalies</div>
                <div className="space-y-2">
                  {bank.anomalies.map((anomaly) => (
                    <div key={anomaly} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">{label}</div>
      <div className="mt-2 font-display text-lg text-white">{value}</div>
    </div>
  );
}

