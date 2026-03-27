import { useMemo, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

const nodePalette = {
  victim: "#59a7ff",
  mule: "#ff5f79",
  sink: "#ff9d43",
  predicted: "#ffb85c",
};

export function ThreatGraph({ graph, selectedCase, onNodeClick, selectedAccount }) {
  const graphRef = useRef(null);
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => ({
        ...node,
        color: nodePalette[node.node_type] || "#7de2d1",
        val: node.risk_score > 85 ? 10 : 6,
      })),
      links: graph.links.map((link) => ({
        ...link,
        color: link.status === "predicted" ? "#ff9d43" : link.status === "frozen" ? "#7de2d1" : "#365981",
      })),
    }),
    [graph],
  );

  return (
    <div className="panel h-[520px] overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="panel-heading">VARUNA Sentinel Graph</div>
          <div className="text-sm text-slate-400">
            Multi-bank mule chain expansion and predicted dissipation rails
          </div>
        </div>
        <div className="rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange">
          {selectedCase.predicted_next_hops.length} future hops projected
        </div>
      </div>
      <ForceGraph2D
        ref={graphRef}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(node) => `${node.id} | ${node.bank}`}
        cooldownTicks={80}
        linkWidth={(link) => (link.status === "predicted" ? 2.5 : 1.5)}
        linkDirectionalParticles={(link) => (link.status === "predicted" ? 5 : 2)}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2}
        linkColor={(link) => link.color}
        onNodeClick={(node) => onNodeClick?.(node.id)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          const radius = node.id === selectedAccount ? node.val + 4 : node.val;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.shadowBlur = 18;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0;
          if (node.id === selectedAccount) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
            ctx.strokeStyle = "#ecf6ff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          ctx.font = `${fontSize}px Space Grotesk`;
          ctx.fillStyle = "#d7e5f5";
          ctx.fillText(label, node.x + 10, node.y + 4);
        }}
      />
      <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
        <span className="rounded-full border border-blue/30 px-3 py-1 text-blue">Victim Origin</span>
        <span className="rounded-full border border-red/30 px-3 py-1 text-red">Observed Mule</span>
        <span className="rounded-full border border-cyan/30 px-3 py-1 text-cyan">Frozen Edge</span>
        <span className="rounded-full border border-orange/30 px-3 py-1 text-orange">Predicted Dissipation</span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-white">Click Node To Investigate</span>
      </div>
    </div>
  );
}

