export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatSeconds(value) {
  return `${value}s`;
}

export function severityTone(level) {
  if (level === "critical") return "text-red bg-red/10 border-red/30";
  if (level === "high") return "text-orange bg-orange/10 border-orange/30";
  if (level === "success") return "text-[#FF4500] bg-[#FF4500]/10 border-[#FF4500]/30";
  return "text-white/50 bg-white/[0.04] border-white/[0.07]";
}

