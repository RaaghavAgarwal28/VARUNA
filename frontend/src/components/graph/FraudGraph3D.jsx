
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applyBundleLayout, removeBundleLayout } from "../../lib/bundleLayout";

function resolveId(endpoint) {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

/**
 * Map VARUNA node_type to anomalous status.
 * victim, mule, suspect, sink → anomalous
 * predicted → normal
 */
function isAnomalous(nodeType) {
  return ["victim", "mule", "suspect", "sink"].includes(nodeType);
}

export function FraudGraph3D({ graph, onNodeClick }) {
  const fgRef = useRef(null);
  const [ForceGraph3DComp, setForceGraph3DComp] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showOnlyFraud, setShowOnlyFraud] = useState(false);
  const [isBundled, setIsBundled] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [searchId, setSearchId] = useState("");
  const [searchError, setSearchError] = useState("");
  const hasFitted = useRef(false);
  const containerRef = useRef(null);

  // Mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure container dimensions
  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mounted]);

  // Dynamic import of react-force-graph-3d (requires browser WebGL)
  useEffect(() => {
    import("react-force-graph-3d").then((mod) => {
      setForceGraph3DComp(() => mod.default);
    });
  }, []);

  // Convert VARUNA graph data to 3D graph format
  const rawGraph = useMemo(() => {
    if (!graph) return null;
    return {
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        is_anomalous: isAnomalous(n.node_type),
        node_type: n.node_type,
        label: n.label,
        bank: n.bank,
        risk_score: n.risk_score,
        status: n.status,
      })),
      links: graph.links
        .filter((l) => l.source && l.target)
        .map((l) => ({
          source: String(l.source),
          target: String(l.target),
        })),
    };
  }, [graph]);

  // Filter and layout
  const visibleGraph = useMemo(() => {
    if (!rawGraph) return null;
    let g = rawGraph;

    if (showOnlyFraud) {
      const fraudIds = new Set(g.nodes.filter((n) => n.is_anomalous).map((n) => n.id));
      g = {
        nodes: g.nodes.filter((n) => fraudIds.has(n.id)),
        links: g.links.filter(
          (l) => fraudIds.has(resolveId(l.source)) && fraudIds.has(resolveId(l.target))
        ),
      };
    }

    return isBundled ? applyBundleLayout(g) : removeBundleLayout(g);
  }, [rawGraph, showOnlyFraud, isBundled]);

  // Focus data for highlighting neighbors
  const focusData = useMemo(() => {
    if (!activeNodeId || !visibleGraph) {
      return { neighborSet: new Set(), fraudCluster: new Set() };
    }

    const neighborSet = new Set([activeNodeId]);
    const fraudCluster = new Set();

    visibleGraph.links.forEach((link) => {
      const s = resolveId(link.source);
      const t = resolveId(link.target);
      if (s === activeNodeId) neighborSet.add(t);
      if (t === activeNodeId) neighborSet.add(s);
    });

    visibleGraph.links.forEach((link) => {
      const s = resolveId(link.source);
      const t = resolveId(link.target);
      const sourceNode = typeof link.source === "object" ? link.source : null;
      const targetNode = typeof link.target === "object" ? link.target : null;

      if (
        sourceNode?.is_anomalous &&
        targetNode?.is_anomalous &&
        (neighborSet.has(s) || neighborSet.has(t))
      ) {
        fraudCluster.add(s);
        fraudCluster.add(t);
      }
    });

    return { neighborSet, fraudCluster };
  }, [activeNodeId, visibleGraph]);

  const handleToggleBundle = () => {
    setIsBundled((prev) => !prev);
    hasFitted.current = false;
  };

  const handleSearch = () => {
    if (!searchId.trim()) return;
    const node = rawGraph?.nodes.find((n) => String(n.id) === searchId.trim());
    if (!node) {
      setSearchError("Account not found");
      return;
    }
    setSearchError("");
    setActiveNodeId(node.id);
    onNodeClick?.(node.id);

    setTimeout(() => {
      if (!fgRef.current || node.x === undefined) return;
      const distance = 80;
      const distRatio =
        1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      fgRef.current.cameraPosition(
        {
          x: (node.x ?? 0) * distRatio,
          y: (node.y ?? 0) * distRatio,
          z: (node.z ?? 0) * distRatio,
        },
        node,
        800
      );
    }, 500);
  };

  const handleResetView = () => {
    if (!fgRef.current) return;
    setActiveNodeId(null);
    fgRef.current.zoomToFit(800);
  };

  const handleZoomIn = () => {
    if (!fgRef.current) return;
    const camera = fgRef.current.camera();
    fgRef.current.cameraPosition({ z: camera.position.z * 0.85 }, undefined, 500);
  };

  const handleZoomOut = () => {
    if (!fgRef.current) return;
    const camera = fgRef.current.camera();
    fgRef.current.cameraPosition({ z: camera.position.z * 1.15 }, undefined, 500);
  };

  const handleNodeClick = (node) => {
    setActiveNodeId(node.id);
    onNodeClick?.(node.id);

    const distance = 60;
    const distRatio =
      1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);

    fgRef.current?.cameraPosition(
      {
        x: (node.x ?? 0) * distRatio,
        y: (node.y ?? 0) * distRatio,
        z: (node.z ?? 0) * distRatio,
      },
      node,
      800
    );
  };

  const getLinkColor = (link) => {
    if (!activeNodeId) return "rgba(48, 72, 105, 1)";
    const s = resolveId(link.source);
    const t = resolveId(link.target);
    const connected = s === activeNodeId || t === activeNodeId;

    const sNode = typeof link.source === "object" ? link.source : null;
    const tNode = typeof link.target === "object" ? link.target : null;
    const fraudToFraud = sNode?.is_anomalous && tNode?.is_anomalous;

    if (fraudToFraud && connected) return "#ef4444";
    if (connected) return "#60a5fa";
    return "rgba(5, 5, 5, 0.01)";
  };

  const getLinkOpacity = (link) => {
    if (!activeNodeId) return 0.5;
    const s = resolveId(link.source);
    const t = resolveId(link.target);
    return s === activeNodeId || t === activeNodeId ? 1 : 0.02;
  };

  const buildNodeObject = (node) => {
    const isSelected = node.id === activeNodeId;
    const isNeighbor = focusData.neighborSet.has(node.id);

    const baseColor = node.is_anomalous ? "#7f1d1d" : "#14532d";
    let opacity = 1;

    if (activeNodeId) {
      opacity = isSelected || isNeighbor ? 1 : 0.12;
    }

    const group = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(3, 24, 24),
      new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: true,
        opacity,
      })
    );
    group.add(sphere);

    if (isSelected) {
      const border = new THREE.Mesh(
        new THREE.SphereGeometry(3.6, 32, 32),
        new THREE.MeshBasicMaterial({ color: "#3b82f6", wireframe: true })
      );
      group.add(border);
    }

    return group;
  };

  // Hover tooltip — shows Account ID and Anomalous/Normal status
  const getNodeLabel = (node) => `
    <div style="
      background: rgba(10, 15, 25, 0.95);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid ${node.is_anomalous ? "#7f1d1d" : "#14532d"};
      font-size: 12px;
      color: white;
      font-family: 'Manrope', sans-serif;
    ">
      <div style="font-weight: 600;">Account ${node.id}</div>
      <div style="margin-top: 4px; color: ${node.is_anomalous ? "#f87171" : "#4ade80"};">
        Status: ${node.is_anomalous ? "🔴 Anomalous" : "🟢 Normal"}
      </div>
      <div style="margin-top: 2px; color: #94a3b8; font-size: 11px;">
        Type: ${(node.node_type || "unknown").toUpperCase()} · ${node.bank || ""}
      </div>
    </div>
  `;

  if (!mounted || !visibleGraph || !ForceGraph3DComp) {
    return (
      <div className="panel flex h-[700px] items-center justify-center text-white">
        <div className="text-center">
          <div className="font-display text-2xl mb-2">Initializing 3D Engine…</div>
          <div className="text-slate-400 text-sm">Loading WebGL renderer and graph data</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="panel relative h-[700px] overflow-hidden rounded-[20px]">
      {/* ── Left panel ── */}
      <div
        className="absolute top-4 left-4 z-20
                   rounded-2xl border border-line/70 bg-black/80 backdrop-blur-xl
                   p-4 w-60 text-sm text-slate-300"
      >
        <h3 className="text-white font-display text-base font-semibold mb-1">
          Fraud Transaction Network
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Red nodes indicate anomalous accounts. Hover for details.
        </p>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search Account ID..."
            value={searchId}
            onChange={(e) => {
              setSearchId(e.target.value);
              setSearchError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="w-full px-3 py-2 text-sm bg-white/[0.05] border border-line/70 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan/50"
          />
          {searchError && (
            <p className="text-red text-xs mt-1">{searchError}</p>
          )}
        </div>

        {/* Fraud filter */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={showOnlyFraud}
            onChange={() => setShowOnlyFraud((v) => !v)}
            className="accent-red-600"
          />
          <span>Show only fraud nodes</span>
        </label>

        {/* Legend */}
        <div className="space-y-1.5 text-xs">
          <LegendDot color="#7f1d1d" label="Anomalous (Fraud)" />
          <LegendDot color="#14532d" label="Normal" />
          <LegendDot color="rgba(100,140,255,0.5)" label="Transaction Link" />
        </div>

        {/* Bundle layout legend */}
        {isBundled && (
          <div className="mt-3 pt-3 border-t border-line/70 space-y-1 text-xs text-slate-500">
            <p className="font-medium text-slate-300 mb-1">Clusters</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-900 inline-block" />
              <span>Fraud accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-900 inline-block" />
              <span>Low connectivity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-700 inline-block" />
              <span>Mid connectivity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span>High connectivity</span>
            </div>
          </div>
        )}

        {/* Reset view */}
        <button
          onClick={handleResetView}
          className="mt-4 w-full py-2 text-xs
                     bg-white/[0.05] hover:bg-white/[0.1]
                     border border-line/70
                     rounded-lg text-slate-300 transition"
        >
          Reset View
        </button>

        {/* Bundle layout toggle */}
        <button
          onClick={handleToggleBundle}
          className={`mt-2 w-full py-2 text-xs rounded-lg border transition ${isBundled
              ? "bg-cyan/10 border-cyan/30 text-cyan"
              : "bg-white/[0.05] hover:bg-white/[0.1] border-line/70 text-slate-300"
            }`}
        >
          {isBundled ? "⬡ Bundle Layout ON" : "⬡ Bundle Layout OFF"}
        </button>
      </div>

      {/* ── Zoom controls ── */}
      <div className="absolute bottom-6 left-4 z-20 flex flex-col gap-2">
        {[
          { label: "+", fn: handleZoomIn },
          { label: "−", fn: handleZoomOut },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            className="w-10 h-10 rounded-full
                       bg-black/80 backdrop-blur-xl
                       border border-line/70
                       text-white text-lg
                       hover:border-cyan/50
                       hover:shadow-[0_0_10px_rgba(0,200,255,0.3)]
                       transition duration-200"
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 3D Graph ── */}
      <ForceGraph3DComp
        ref={fgRef}
        graphData={visibleGraph}
        width={dimensions.width || 800}
        height={dimensions.height || 700}
        backgroundColor="#050814"
        enableNodeDrag={false}
        linkWidth={0.3}
        d3ForceStrength={isBundled ? 0 : -160}
        d3VelocityDecay={isBundled ? 1 : 0.28}
        nodeLabel={getNodeLabel}
        nodeThreeObject={buildNodeObject}
        linkColor={getLinkColor}
        linkOpacity={getLinkOpacity}
        onNodeClick={handleNodeClick}
        onEngineStop={() => {
          if (!hasFitted.current) {
            fgRef.current?.zoomToFit(800);
            hasFitted.current = true;
          }
        }}
      />
    </div>
  );
}
