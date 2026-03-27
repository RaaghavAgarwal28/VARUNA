import { useMemo, useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

const nodePalette = {
  victim: "#59a7ff",
  mule: "#ff5f79",
  sink: "#ff9d43",
  predicted: "#ffb85c",
};

const statusColors = {
  frozen: "#7de2d1",
  predicted: "#ff9d43",
  flagged: "#ff5f79",
  dissipated: "#ff9d43",
  processing: "#365981",
  observed: "#365981",
};

function formatAmount(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export function ThreatGraph({ graph, selectedCase, onNodeClick, selectedAccount }) {
  const graphRef = useRef(null);
  const [rupeeImg, setRupeeImg] = useState(null);

  // Preload the rupee image
  useEffect(() => {
    const img = new Image();
    img.src = "/rupee.png";
    img.onload = () => setRupeeImg(img);
  }, []);

  // Force continuous re-render for smooth animation
  const [, setTick] = useState(0);
  useEffect(() => {
    let frameId;
    const animate = () => {
      setTick((t) => t + 1);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const data = useMemo(() => {
    return {
      nodes: graph.nodes.map((node) => {
        const totalIn = graph.links
          .filter((l) => l.target === node.id)
          .reduce((sum, l) => sum + (l.amount || 0), 0);
        const totalOut = graph.links
          .filter((l) => l.source === node.id)
          .reduce((sum, l) => sum + (l.amount || 0), 0);

        return {
          ...node,
          color: nodePalette[node.node_type] || "#7de2d1",
          val: node.risk_score > 85 ? 12 : 7,
          totalIn,
          totalOut,
        };
      }),
      links: graph.links.map((link) => ({
        ...link,
        color: statusColors[link.status] || "#365981",
      })),
    };
  }, [graph]);

  return (
    <div className="panel h-[580px] overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="panel-heading">VARUNA Sentinel Graph</div>
          <div className="text-sm text-slate-400">
            Multi-bank mule chain · ₹ symbols flow along money trails
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
        cooldownTicks={80}
        linkWidth={(link) => {
          const amount = link.amount || 0;
          if (amount >= 100000) return 4;
          if (amount >= 50000) return 3;
          if (amount >= 20000) return 2.5;
          return 1.5;
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={0.7}
        linkColor={(link) => link.color}
        linkCurvature={0.15}
        onNodeClick={(node) => onNodeClick?.(node.id)}

        /* ── Rupee particle config ── */
        linkDirectionalParticles={(link) => {
          const amount = link.amount || 0;
          if (amount >= 100000) return 6;
          if (amount >= 50000) return 4;
          if (amount >= 10000) return 3;
          return 2;
        }}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={0}  /* We draw custom, so hide default */

        /* ── Custom rupee particle renderer ── */
        linkDirectionalParticleColor={() => "rgba(0,0,0,0)"}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link, ctx, globalScale) => {
          if (!link.source.x || !link.target.x) return;

          const midX = (link.source.x + link.target.x) / 2;
          const midY = (link.source.y + link.target.y) / 2;
          const fontSize = Math.max(10 / globalScale, 2);

          // ── Draw amount label at midpoint ──
          if (link.amount) {
            const label = formatAmount(link.amount);
            ctx.save();
            ctx.font = `bold ${fontSize}px Space Grotesk`;
            const textWidth = ctx.measureText(label).width;
            const padding = fontSize * 0.4;

            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            const rx = midX - textWidth / 2 - padding;
            const ry = midY - fontSize / 2 - padding;
            const rw = textWidth + padding * 2;
            const rh = fontSize + padding * 2;
            const radius = fontSize * 0.4;
            ctx.beginPath();
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + rw - radius, ry);
            ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
            ctx.lineTo(rx + rw, ry + rh - radius);
            ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
            ctx.lineTo(rx + radius, ry + rh);
            ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = link.status === "predicted"
              ? "rgba(255, 157, 67, 0.5)"
              : link.status === "frozen"
                ? "rgba(125, 226, 209, 0.5)"
                : "rgba(54, 89, 129, 0.5)";
            ctx.lineWidth = 1 / globalScale;
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = link.amount >= 50000 ? "#ff5f79" : link.amount >= 20000 ? "#ff9d43" : "#7de2d1";
            ctx.fillText(label, midX, midY);
            ctx.restore();
          }

          // ── Animated ₹ symbols flowing along the edge ──
          const dx = link.target.x - link.source.x;
          const dy = link.target.y - link.source.y;
          const edgeLen = Math.sqrt(dx * dx + dy * dy);
          if (edgeLen < 1) return;

          const amount = link.amount || 0;
          const particleCount = amount >= 100000 ? 5 : amount >= 50000 ? 4 : amount >= 10000 ? 3 : 2;
          const now = Date.now();
          const speed = 0.0003;
          const rupeeSize = Math.max(18 / globalScale, 5);

          for (let i = 0; i < particleCount; i++) {
            const t = ((now * speed + i / particleCount) % 1);
            const px = link.source.x + dx * t;
            const py = link.source.y + dy * t;

            // Pulsing opacity
            const opacity = 0.3 + 0.2 * Math.sin(now * 0.004 + i * 2.0);

            ctx.save();
            ctx.globalAlpha = opacity;

            // Glowing circle behind the rupee
            const glowColor = link.status === "predicted" ? "#ff9d43" : link.status === "frozen" ? "#7de2d1" : "#59a7ff";
            ctx.beginPath();
            ctx.arc(px, py, rupeeSize * 0.75, 0, 2 * Math.PI);
            ctx.fillStyle = glowColor;
            ctx.shadowBlur = 12;
            ctx.shadowColor = glowColor;
            ctx.fill();
            ctx.shadowBlur = 0;

            if (rupeeImg) {
              // Draw the rupee image on top, slightly brighter
              ctx.globalAlpha = opacity + 0.2;
              ctx.drawImage(
                rupeeImg,
                px - rupeeSize / 2,
                py - rupeeSize / 2,
                rupeeSize,
                rupeeSize
              );
            } else {
              // Fallback: draw ₹ text
              const rFontSize = Math.max(14 / globalScale, 4);
              ctx.font = `bold ${rFontSize}px Space Grotesk`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#ffffff";
              ctx.globalAlpha = opacity + 0.2;
              ctx.fillText("₹", px, py);
            }
            ctx.restore();
          }
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const fontSize = 11 / globalScale;
          const radius = node.id === selectedAccount ? node.val + 4 : node.val;

          // Glow ring for selected
          if (node.id === selectedAccount) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();
          }

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.shadowBlur = 20;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Status ring (frozen = cyan dashed ring)
          if (node.status === "frozen") {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI, false);
            ctx.strokeStyle = "#7de2d1";
            ctx.lineWidth = 2 / globalScale;
            ctx.setLineDash([3 / globalScale, 3 / globalScale]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Node label (account ID)
          ctx.font = `bold ${fontSize}px Space Grotesk`;
          ctx.fillStyle = "#e2e8f0";
          ctx.fillText(node.label, node.x + radius + 4, node.y - 2);

          // Bank name (smaller)
          const bankFontSize = 9 / globalScale;
          ctx.font = `${bankFontSize}px Space Grotesk`;
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(node.bank || "", node.x + radius + 4, node.y + fontSize * 0.8);

          // Money flow summary
          const flowFontSize = 8 / globalScale;
          ctx.font = `${flowFontSize}px Space Grotesk`;
          if (node.totalIn > 0 || node.totalOut > 0) {
            const inLabel = node.totalIn > 0 ? `⬇${formatAmount(node.totalIn)}` : "";
            const outLabel = node.totalOut > 0 ? `⬆${formatAmount(node.totalOut)}` : "";
            const flowText = [inLabel, outLabel].filter(Boolean).join(" ");
            ctx.fillStyle = "#64748b";
            ctx.fillText(flowText, node.x + radius + 4, node.y + fontSize * 0.8 + bankFontSize + 2);
          }

          // Type badge
          const badgeFontSize = 7 / globalScale;
          const typeLabel = node.node_type?.toUpperCase() || "";
          if (typeLabel) {
            ctx.font = `bold ${badgeFontSize}px Space Grotesk`;
            const tw = ctx.measureText(typeLabel).width;
            const bx = node.x - tw / 2 - 2;
            const by = node.y + radius + 4;
            ctx.fillStyle = node.color + "33";
            ctx.fillRect(bx, by, tw + 4, badgeFontSize + 3);
            ctx.fillStyle = node.color;
            ctx.textAlign = "center";
            ctx.fillText(typeLabel, node.x, by + badgeFontSize);
            ctx.textAlign = "left";
          }
        }}
      />
      <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
        <span className="rounded-full border border-blue/30 px-3 py-1 text-blue">Victim Origin</span>
        <span className="rounded-full border border-red/30 px-3 py-1 text-red">Observed Mule</span>
        <span className="rounded-full border border-cyan/30 px-3 py-1 text-cyan">Frozen Edge</span>
        <span className="rounded-full border border-orange/30 px-3 py-1 text-orange">Predicted Dissipation</span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-white">₹ Flow Animation</span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-white">Click Node To Investigate</span>
      </div>
    </div>
  );
}
