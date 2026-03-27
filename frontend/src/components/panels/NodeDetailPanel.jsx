export function NodeDetailPanel({ node, temporalModel }) {
  if (!node) {
    return null;
  }

  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">Node Detail</div>
        <div className="text-sm text-slate-400">Account-level investigation drilldown</div>
      </div>
      <div className="space-y-3">
        <Row label="Account" value={node.id} />
        <Row label="Bank" value={node.bank} />
        <Row label="Type" value={node.node_type} />
        <Row label="Status" value={node.status} />
        <Row label="Balance" value={`INR ${node.balance}`} />
        <Row label="Risk Score" value={node.risk_score} />
        <Row label="Human Coordination" value={node.human_coordination_score} />
        <Row label="Dissipation Risk" value={node.dissipation_risk} />
        <Row label="Temporal Summary" value={temporalModel?.sequence_summary || "-"} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line/70 bg-white/[0.02] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="text-right text-sm text-white">{value}</div>
    </div>
  );
}

