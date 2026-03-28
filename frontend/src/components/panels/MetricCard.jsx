import clsx from "clsx";

export function MetricCard({ label, value, hint, accent = "cyan" }) {
  return (
    <div className={clsx("panel p-5", accent === "orange" && "border-orange/40", accent === "red" && "border-red/40")}>
      <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/40">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="mt-2 text-sm text-white/40">{hint}</div>
    </div>
  );
}

