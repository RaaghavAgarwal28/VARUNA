import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

/* ── Refined colour palette ── */
const nodePalette = {
  victim:    "#4da6ff",   // calm blue
  mule:      "#e8475f",   // warm crimson
  sink:      "#f0a040",   // amber
  predicted: "#c084fc",   // soft violet
};

const ringColor = {
  frozen:    "#5ee9d5",
  predicted: "#c084fc",
};

const linkPalette = {
  frozen:     "rgba(94, 233, 213, 0.55)",
  predicted:  "rgba(192, 132, 252, 0.4)",
  flagged:    "rgba(232, 71, 95, 0.35)",
  dissipated: "rgba(240, 160, 64, 0.35)",
  processing: "rgba(100, 140, 190, 0.25)",
  observed:   "rgba(100, 140, 190, 0.25)",
};

/** BFS depth from victim(s) → gives hierarchical hint to force layout */
function computeDepths(nodes, links) {
  const adj = {};
  links.forEach((l) => {
    const src = typeof l.source === "object" ? l.source.id : l.source;
    const tgt = typeof l.target === "object" ? l.target.id : l.target;
    if (!adj[src]) adj[src] = [];
    adj[src].push(tgt);
  });

  const depths = {};
  const victims = nodes.filter((n) => n.node_type === "victim").map((n) => n.id);
  const seeds = victims.length ? victims : [nodes[0]?.id];
  const queue = seeds.map((id) => ({ id, depth: 0 }));
  const visited = new Set(seeds);

  while (queue.length) {
    const { id, depth } = queue.shift();
    depths[id] = depth;
    (adj[id] || []).forEach((nb) => {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push({ id: nb, depth: depth + 1 });
      }
    });
  }
  const maxD = Math.max(0, ...Object.values(depths));
  nodes.forEach((n) => { if (!(n.id in depths)) depths[n.id] = maxD + 1; });
  return depths;
}

export function ThreatGraph({ graph, selectedCase, onNodeClick, selectedAccount }) {
  const graphRef = useRef(null);
  const fittedRef = useRef(false);

  /* ── Build enriched graph data ── */
  const data = useMemo(() => {
    const depths = computeDepths(graph.nodes, graph.links);
    const depthCounts = {};
    graph.nodes.forEach((n) => {
      const d = depths[n.id] || 0;
      depthCounts[d] = (depthCounts[d] || 0) + 1;
    });
    const depthIdx = {};

    return {
      nodes: graph.nodes.map((node) => {
        const depth = depths[node.id] || 0;
        if (!depthIdx[depth]) depthIdx[depth] = 0;
        const idx = depthIdx[depth]++;
        const cnt = depthCounts[depth] || 1;

        // Moderate initial spread — not too wide, not clumped
        const xSpacing = 100;
        const ySpread = 80;
        const yOff = (idx - (cnt - 1) / 2) * ySpread;

        return {
          ...node,
          color: nodePalette[node.node_type] || "#5ee9d5",
          // Bigger nodes for readability
          val: node.node_type === "victim" ? 18
             : node.node_type === "sink" ? 16
             : node.risk_score > 85 ? 15
             : 12,
          depth,
          x: depth * xSpacing,
          y: yOff,
        };
      }),
      links: graph.links.map((link) => ({
        ...link,
        color: linkPalette[link.status] || linkPalette.observed,
      })),
    };
  }, [graph]);

  /* ── Configure d3 forces for balanced spacing ── */
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;

    fg.d3Force("charge")?.strength(-450)?.distanceMax(350);

    const linkForce = fg.d3Force("link");
    if (linkForce) {
      linkForce.distance(80).strength(0.5);
    }

    // Auto zoom-to-fit once
    if (!fittedRef.current) {
      fittedRef.current = true;
      setTimeout(() => fg.zoomToFit(400, 50), 1800);
    }
  }, [data]);

  return (
    <div className="panel h-[580px] overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="panel-heading">VARUNA Sentinel Graph</div>
          <div className="text-sm text-slate-400">
            Multi-bank mule chain expansion · Click any node to investigate
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
        nodeLabel=""
        cooldownTicks={160}
        warmupTicks={40}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.35}
        /* ── Links ── */
        linkWidth={(link) => (link.status === "predicted" ? 1.2 : 2)}
        linkDirectionalParticles={3}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleWidth={2}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={0.7}
        linkColor={(link) => link.color}
        linkCurvature={0.12}
        linkLineDash={(link) => (link.status === "predicted" ? [4, 4] : null)}
        onNodeClick={(node) => onNodeClick?.(node.id)}
        /* ── Node rendering ── */
        nodeCanvasObject={(node, ctx, globalScale) => {
          const r = node.id === selectedAccount ? node.val + 3 : node.val;
          const fs = Math.max(11 / globalScale, 3);

          /* Selection glow */
          if (node.id === selectedAccount) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth = 1.5 / globalScale;
            ctx.stroke();
          }

          /* Outer glow */
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.shadowBlur = 18;
          ctx.shadowColor = node.color;
          ctx.fillStyle = node.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          /* Inner bright core */
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fill();

          /* ₹ symbol */
          const symSize = (r * 1.6) / globalScale;
          ctx.font = `bold ${symSize}px Space Grotesk`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillText("₹", node.x, node.y);

          /* Frozen ring */
          if (node.status === "frozen") {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = ringColor.frozen;
            ctx.lineWidth = 1.8 / globalScale;
            ctx.setLineDash([3 / globalScale, 3 / globalScale]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          /* Predicted ring */
          if (node.node_type === "predicted") {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = ringColor.predicted;
            ctx.lineWidth = 1.5 / globalScale;
            ctx.setLineDash([2 / globalScale, 3 / globalScale]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          /* Account label */
          ctx.textAlign = "left";
          ctx.font = `600 ${fs}px Space Grotesk`;
          ctx.fillStyle = "#e2e8f0";
          ctx.fillText(node.label, node.x + r + 5, node.y - 1);

          /* Bank label */
          const bfs = Math.max(8.5 / globalScale, 2.5);
          ctx.font = `${bfs}px Space Grotesk`;
          ctx.fillStyle = "#64748b";
          ctx.fillText(node.bank || "", node.x + r + 5, node.y + fs * 0.9);

          /* Type badge */
          const tfs = Math.max(6.5 / globalScale, 2);
          const badge = node.node_type?.toUpperCase() || "";
          if (badge) {
            ctx.font = `bold ${tfs}px Space Grotesk`;
            const tw = ctx.measureText(badge).width;
            const bx = node.x - tw / 2 - 2;
            const by = node.y + r + 3;
            ctx.fillStyle = node.color + "30";
            ctx.fillRect(bx, by, tw + 4, tfs + 3);
            ctx.textAlign = "center";
            ctx.fillStyle = node.color;
            ctx.fillText(badge, node.x, by + tfs);
            ctx.textAlign = "left";
          }
        }}
      />

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: nodePalette.victim }} />
          Victim
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: nodePalette.mule }} />
          Mule
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: nodePalette.sink }} />
          Sink
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: nodePalette.predicted }} />
          Predicted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ringColor.frozen }} />
          Frozen
        </span>
      </div>
    </div>
  );
}
