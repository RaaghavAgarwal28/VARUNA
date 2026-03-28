const threatDot = {
  Severe: "bg-red shadow-[0_0_24px_rgba(255,95,121,0.7)]",
  High: "bg-orange shadow-[0_0_24px_rgba(255,157,67,0.7)]",
  Elevated: "bg-[#FF4500] shadow-[0_0_24px_rgba(255,69,0,0.7)]",
};

export function IndiaBankMapPanel({ bankIntel }) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">India Bank-State Impact Map</div>
        <div className="text-sm text-white/40">
          States light up where linked banks are seeing anomalous mule-chain activity
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[radial-gradient(circle_at_top,rgba(255,69,0,0.16),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.5),rgba(0,0,0,0.9))] p-4">
        <svg viewBox="0 0 320 420" className="mx-auto h-[440px] w-full max-w-[420px]">
          <path
            d="M155 18l35 20 22 45 25 25 10 35-16 34 8 24-20 22 7 28-18 29-12 36-31 18-11 31-16 24-19-13-16-37-18-18-24-36-12-41-31-18-8-36 10-31-16-36 18-33 28-10 24-28 28-16 22-16z"
            fill="rgba(255,69,0,0.08)"
            stroke="rgba(255,69,0,0.25)"
            strokeWidth="2"
          />
          <path
            d="M245 344l19 17 7 26-19 14-18-19 11-38z"
            fill="rgba(255,69,0,0.06)"
            stroke="rgba(255,69,0,0.18)"
            strokeWidth="2"
          />
        </svg>

        <div className="pointer-events-none absolute inset-0">
          {bankIntel.states.map((entry) => (
            <div
              key={`${entry.bank}-${entry.state}`}
              className="absolute"
              style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
            >
              <div className={`h-3 w-3 rounded-full ${threatDot[entry.threatLevel]}`} />
              <div className="mt-2 -translate-x-1/2 rounded-2xl border border-white/[0.07] bg-black/75 px-3 py-2 text-[11px] leading-5 text-slate-100 backdrop-blur-xl">
                <div className="font-semibold text-white">{entry.bank}</div>
                <div className="text-white/40">
                  {entry.city}, {entry.state}
                </div>
                <div className="text-orange">{entry.anomalies[0]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/40">
        <span className="rounded-full border border-red/30 px-3 py-1 text-red">Severe anomaly</span>
        <span className="rounded-full border border-orange/30 px-3 py-1 text-orange">High anomaly</span>
        <span className="rounded-full border border-[#FF4500]/30 px-3 py-1 text-[#FF4500]">Elevated anomaly</span>
      </div>
    </div>
  );
}

