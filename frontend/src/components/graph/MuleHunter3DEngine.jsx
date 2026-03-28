/**
 * MuleHunter3DEngine — Full 3D Mule Hunter Engine Dashboard
 *
 * Imported and adapted from the MULE_HUNTER repository's 3D engine.
 * Renders all vertices and nodes in immersive 3D with:
 *   - Ring detection (STAR, CHAIN, CYCLE, DENSE CLUSTER)
 *   - Node role assignment (HUB, BRIDGE, MULE)
 *   - Multi-layer risk coloring (Victim, Mule, Sink, Predicted)
 *   - Directional animated edges with particle flow
 *   - Search, filter by type & ring
 *   - Bundle layout clustering
 *   - Ring isolation view
 *   - Live statistics overlay
 *   - Node inspector on click
 *   - Premium glassmorphism UI
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";
import { applyBundleLayout, removeBundleLayout } from "../../lib/bundleLayout";
import { detectRings, getRingSubgraph } from "../../lib/ringDetection";
import {
  Search,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Activity,
  Brain,
  Target,
  Network,
  Hexagon,
  X,
} from "lucide-react";

/* ── Constants ── */
const NODE_COLORS = {
  victim:    "#4da6ff",
  mule:      "#e8475f",
  sink:      "#f0a040",
  suspect:   "#ff6b6b",
  predicted: "#c084fc",
  default:   "#5ee9d5",
};

const ROLE_COLORS = {
  HUB:    "#ff2d55",
  BRIDGE: "#ffcc02",
  MULE:   "#8e8e93",
};

const ROLE_ICONS = {
  HUB:    "🔴",
  BRIDGE: "🟡",
  MULE:   "⚪",
};

const RING_TYPE_COLORS = {
  CYCLE: "#ef4444",
  STAR:  "#f59e0b",
  CHAIN: "#8b5cf6",
  DENSE: "#ec4899",
};

function resolveId(endpoint) {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

function isAnomalous(nodeType) {
  return ["victim", "mule", "suspect", "sink"].includes(nodeType);
}

/* ── Sub-components ── */

function StatBox({ label, value, accent = "cyan" }) {
  const accents = {
    cyan: "border-[#FF4500]/30 bg-[#FF4500]/5 text-[#FF4500]",
    red: "border-red/30 bg-red/5 text-red",
    orange: "border-orange/30 bg-orange/5 text-orange",
    purple: "border-purple-400/30 bg-purple-400/5 text-purple-400",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${accents[accent]}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-0.5 font-display text-lg text-white">{value}</div>
    </div>
  );
}

function RingCard({ ring, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(ring)}
      className={`w-full text-left rounded-xl border p-2.5 transition-all text-xs ${
        isActive
          ? "border-[#FF4500]/40 bg-[#FF4500]/10 shadow-lg shadow-[#FF4500]/5"
          : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] hover:border-line"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span>{ring.icon}</span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
          style={{ background: RING_TYPE_COLORS[ring.type] + "20", color: RING_TYPE_COLORS[ring.type] }}
        >
          {ring.type}
        </span>
      </div>
      <div className="text-white/50 font-medium">{ring.label}</div>
      <div className="text-white/30 mt-0.5">{ring.size} nodes</div>
    </button>
  );
}

/* ── Main Component ── */

export function MuleHunter3DEngine({ graph, onNodeClick, sentinelScores }) {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const hasFitted = useRef(false);

  const [ForceGraph3DComp, setForceGraph3DComp] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [showOnlyFraud, setShowOnlyFraud] = useState(false);
  const [isBundled, setIsBundled] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [searchError, setSearchError] = useState("");
  const [activeRing, setActiveRing] = useState(null);
  const [showRoles, setShowRoles] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [filterType, setFilterType] = useState("all"); // all, victim, mule, sink, predicted
  const [hoveredNode, setHoveredNode] = useState(null);

  const scoreByAccount = useMemo(
    () =>
      Object.fromEntries(
        (sentinelScores || []).map((s) => [s.account_id, s])
      ),
    [sentinelScores]
  );

  // Mount detection
  useEffect(() => { setMounted(true); }, []);

  // Measure container
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

  // Dynamic import
  useEffect(() => {
    import("react-force-graph-3d").then((mod) => {
      setForceGraph3DComp(() => mod.default);
    });
  }, []);

  // Ring detection
  const { rings, roles, stats } = useMemo(() => {
    if (!graph) return { rings: [], roles: new Map(), stats: {} };
    return detectRings(graph);
  }, [graph]);

  // Convert graph data
  const rawGraph = useMemo(() => {
    if (!graph) return null;

    // If a ring is selected, show only that ring's subgraph
    const sourceGraph = activeRing
      ? getRingSubgraph(graph, activeRing.nodes)
      : graph;

    return {
      nodes: sourceGraph.nodes.map((n) => ({
        id: n.id,
        is_anomalous: isAnomalous(n.node_type),
        node_type: n.node_type,
        label: n.label,
        bank: n.bank,
        risk_score: n.risk_score,
        status: n.status,
        balance: n.balance,
        role: roles.get(n.id) || null,
      })),
      links: sourceGraph.links
        .filter((l) => l.source && l.target)
        .map((l) => ({
          source: String(resolveId(l.source)),
          target: String(resolveId(l.target)),
          status: l.status,
          amount: l.amount,
        })),
    };
  }, [graph, activeRing, roles]);

  // Apply filters and layout
  const visibleGraph = useMemo(() => {
    if (!rawGraph) return null;
    let g = rawGraph;

    // Type filter
    if (filterType !== "all") {
      const typeIds = new Set(g.nodes.filter((n) => n.node_type === filterType).map((n) => n.id));
      g = {
        nodes: g.nodes.filter((n) => typeIds.has(n.id)),
        links: g.links.filter((l) => typeIds.has(resolveId(l.source)) && typeIds.has(resolveId(l.target))),
      };
    }

    // Fraud filter
    if (showOnlyFraud) {
      const fraudIds = new Set(g.nodes.filter((n) => n.is_anomalous).map((n) => n.id));
      g = {
        nodes: g.nodes.filter((n) => fraudIds.has(n.id)),
        links: g.links.filter((l) => fraudIds.has(resolveId(l.source)) && fraudIds.has(resolveId(l.target))),
      };
    }

    return isBundled ? applyBundleLayout(g) : removeBundleLayout(g);
  }, [rawGraph, showOnlyFraud, isBundled, filterType]);

  // Focus data for neighbor highlighting
  const focusData = useMemo(() => {
    if (!activeNodeId || !visibleGraph) return { neighborSet: new Set() };
    const neighborSet = new Set([activeNodeId]);
    visibleGraph.links.forEach((link) => {
      const s = resolveId(link.source);
      const t = resolveId(link.target);
      if (s === activeNodeId) neighborSet.add(t);
      if (t === activeNodeId) neighborSet.add(s);
    });
    return { neighborSet };
  }, [activeNodeId, visibleGraph]);

  /* ── Handlers ── */

  const handleSearch = useCallback(() => {
    if (!searchId.trim()) return;
    const node = rawGraph?.nodes.find((n) => String(n.id) === searchId.trim());
    if (!node) { setSearchError("Account not found"); return; }
    setSearchError("");
    setActiveNodeId(node.id);
    onNodeClick?.(node.id);
    setTimeout(() => {
      if (!fgRef.current || node.x === undefined) return;
      const d = 80;
      const dr = 1 + d / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      fgRef.current.cameraPosition(
        { x: (node.x ?? 0) * dr, y: (node.y ?? 0) * dr, z: (node.z ?? 0) * dr },
        node, 800
      );
    }, 500);
  }, [searchId, rawGraph, onNodeClick]);

  const handleNodeClick = useCallback((node) => {
    setActiveNodeId(node.id);
    onNodeClick?.(node.id);
    const d = 60;
    const dr = 1 + d / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    fgRef.current?.cameraPosition(
      { x: (node.x ?? 0) * dr, y: (node.y ?? 0) * dr, z: (node.z ?? 0) * dr },
      node, 800
    );
  }, [onNodeClick]);

  const handleResetView = useCallback(() => {
    setActiveNodeId(null);
    setActiveRing(null);
    hasFitted.current = false;
    fgRef.current?.zoomToFit(800);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!fgRef.current) return;
    const cam = fgRef.current.camera();
    fgRef.current.cameraPosition({ z: cam.position.z * 0.8 }, undefined, 500);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!fgRef.current) return;
    const cam = fgRef.current.camera();
    fgRef.current.cameraPosition({ z: cam.position.z * 1.2 }, undefined, 500);
  }, []);

  const handleToggleBundle = useCallback(() => {
    setIsBundled((p) => !p);
    hasFitted.current = false;
  }, []);

  const handleRingClick = useCallback((ring) => {
    if (activeRing?.id === ring.id) {
      setActiveRing(null);
    } else {
      setActiveRing(ring);
      hasFitted.current = false;
    }
  }, [activeRing]);

  /* ── 3D Rendering ── */

  const getNodeColor = (node) => {
    if (showRoles && node.role) {
      return ROLE_COLORS[node.role];
    }
    return NODE_COLORS[node.node_type] || NODE_COLORS.default;
  };

  const buildNodeObject = useCallback((node) => {
    const isSelected = node.id === activeNodeId;
    const isNeighbor = focusData.neighborSet.has(node.id);
    const baseColor = getNodeColor(node);

    let opacity = 1;
    if (activeNodeId) {
      opacity = isSelected || isNeighbor ? 1 : 0.08;
    }

    const group = new THREE.Group();
    const radius = node.is_anomalous ? 4 : 3;

    // Main sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: true,
        opacity,
        emissive: baseColor,
        emissiveIntensity: isSelected ? 0.5 : 0.15,
        metalness: 0.3,
        roughness: 0.6,
      })
    );
    group.add(sphere);

    // Glow ring for selected
    if (isSelected) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 2, 0.3, 16, 32),
        new THREE.MeshBasicMaterial({
          color: "#3b82f6",
          transparent: true,
          opacity: 0.8,
        })
      );
      group.add(ring);

      const wireframe = new THREE.Mesh(
        new THREE.SphereGeometry(radius + 1.2, 24, 24),
        new THREE.MeshBasicMaterial({
          color: "#60a5fa",
          wireframe: true,
          transparent: true,
          opacity: 0.4,
        })
      );
      group.add(wireframe);
    }

    // Role indicator ring
    if (showRoles && node.role === "HUB") {
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 1.8, 0.5, 16, 32),
        new THREE.MeshBasicMaterial({
          color: ROLE_COLORS.HUB,
          transparent: true,
          opacity: 0.6,
        })
      );
      group.add(outerRing);
    }

    // Frozen indicator
    if (node.status === "frozen") {
      const frozenRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 1, 0.2, 16, 32),
        new THREE.MeshBasicMaterial({
          color: "#5ee9d5",
          transparent: true,
          opacity: 0.7,
        })
      );
      frozenRing.rotation.x = Math.PI / 2;
      group.add(frozenRing);
    }

    return group;
  }, [activeNodeId, focusData, showRoles]);

  const getNodeLabel = useCallback((node) => {
    const role = node.role ? `<div style="margin-top: 3px; color: ${ROLE_COLORS[node.role]};"> Role: ${ROLE_ICONS[node.role]} ${node.role}</div>` : "";
    const score = scoreByAccount[node.id];
    const riskLine = score ? `<div style="margin-top: 3px; color: #f59e0b;">Risk: ${score.risk_score?.toFixed(1) ?? "N/A"}</div>` : "";

    return `
      <div style="
        background: rgba(8, 12, 24, 0.95);
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid ${node.is_anomalous ? "#7f1d1d" : "#14532d"};
        font-size: 12px;
        color: white;
        font-family: 'Manrope', sans-serif;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        min-width: 180px;
      ">
        <div style="font-weight: 700; font-size: 14px;">Account ${node.id}</div>
        <div style="margin-top: 4px; color: ${node.is_anomalous ? "#f87171" : "#4ade80"};">
          ${node.is_anomalous ? "🔴 Anomalous" : "🟢 Normal"}
        </div>
        <div style="margin-top: 3px; color: #94a3b8;">
          Type: ${(node.node_type || "unknown").toUpperCase()} · ${node.bank || ""}
        </div>
        ${role}
        ${riskLine}
      </div>
    `;
  }, [scoreByAccount]);

  const getLinkColor = useCallback((link) => {
    if (!activeNodeId) {
      const statusColors = {
        frozen: "rgba(94, 233, 213, 0.6)",
        predicted: "rgba(192, 132, 252, 0.5)",
        flagged: "rgba(232, 71, 95, 0.45)",
        dissipated: "rgba(240, 160, 64, 0.4)",
      };
      return statusColors[link.status] || "rgba(48, 72, 140, 0.5)";
    }
    const s = resolveId(link.source);
    const t = resolveId(link.target);
    const connected = s === activeNodeId || t === activeNodeId;
    if (connected) return "#60a5fa";
    return "rgba(5, 5, 15, 0.03)";
  }, [activeNodeId]);

  const getLinkWidth = useCallback((link) => {
    if (!activeNodeId) return 0.4;
    const s = resolveId(link.source);
    const t = resolveId(link.target);
    return (s === activeNodeId || t === activeNodeId) ? 1.5 : 0.1;
  }, [activeNodeId]);

  /* ── Render ── */

  if (!mounted || !visibleGraph || !ForceGraph3DComp) {
    return (
      <div className="panel flex h-[850px] items-center justify-center text-white">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-center"
        >
          <div className="font-display text-3xl mb-3">Initializing Mule Hunter 3D Engine…</div>
          <div className="text-white/40 text-sm">Loading WebGL renderer, detecting ring structures, building 3D graph</div>
        </motion.div>
      </div>
    );
  }

  const activeNodeData = activeNodeId
    ? visibleGraph.nodes.find((n) => n.id === activeNodeId)
    : null;
  const activeScore = activeNodeId ? scoreByAccount[activeNodeId] : null;

  return (
    <div className="space-y-6">
      {/* ── Engine Header ── */}
      <div className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red/20 bg-red/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-red">
              <Shield size={12} />
              Mule Hunter 3D Engine
            </div>
            <h2 className="font-display text-3xl text-white">
              3D Fraud Network Intelligence
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Immersive 3D visualization engine ported from MULE_HUNTER. Detect ring structures (Star, Chain, Cycle, Dense Cluster),
              assign node roles (HUB, BRIDGE, MULE), and analyze fraud networks in real-time 3D space.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="Nodes" value={stats.totalNodes ?? 0} accent="cyan" />
            <StatBox label="Fraud" value={stats.fraudNodes ?? 0} accent="red" />
            <StatBox label="Rings" value={stats.ringsDetected ?? 0} accent="orange" />
            <StatBox label="Links" value={stats.totalLinks ?? 0} accent="purple" />
          </div>
        </div>
      </div>

      {/* ── Main Engine Area ── */}
      <div className="grid gap-6 xl:grid-cols-[280px_1fr_280px]">

        {/* ── Left Panel: Controls + Rings ── */}
        <div className="space-y-4">
          {/* Search */}
          <div className="panel p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/30">
              <Search size={12} />
              Search Account
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Account ID..."
                value={searchId}
                onChange={(e) => { setSearchId(e.target.value); setSearchError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#FF4500]/50 focus:outline-none"
              />
              <button onClick={handleSearch} className="rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 hover:bg-white/[0.1] text-white transition">
                <Search size={14} />
              </button>
            </div>
            {searchError && <p className="mt-1 text-xs text-red">{searchError}</p>}
          </div>

          {/* Filters */}
          <div className="panel p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">Filters</div>

            {/* Type filter */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {["all", "victim", "mule", "sink", "predicted"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${
                    filterType === type
                      ? "border border-[#FF4500]/40 bg-[#FF4500]/10 text-[#FF4500]"
                      : "border border-white/[0.05] bg-white/[0.02] text-white/40 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Toggle switches */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/50">
                <input type="checkbox" checked={showOnlyFraud} onChange={() => setShowOnlyFraud((v) => !v)} className="accent-red-600" />
                Fraud nodes only
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/50">
                <input type="checkbox" checked={showRoles} onChange={() => setShowRoles((v) => !v)} className="accent-cyan-500" />
                Show roles (HUB/BRIDGE/MULE)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/50">
                <input type="checkbox" checked={showParticles} onChange={() => setShowParticles((v) => !v)} className="accent-[#FF4500]" />
                Animated particles
              </label>
            </div>
          </div>

          {/* Controls */}
          <div className="panel p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">Controls</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleZoomIn} className="rounded-lg border border-white/[0.07] bg-white/[0.05] py-2 text-xs text-white/50 hover:bg-white/[0.1] transition flex items-center justify-center gap-1">
                <ZoomIn size={12} /> Zoom In
              </button>
              <button onClick={handleZoomOut} className="rounded-lg border border-white/[0.07] bg-white/[0.05] py-2 text-xs text-white/50 hover:bg-white/[0.1] transition flex items-center justify-center gap-1">
                <ZoomOut size={12} /> Zoom Out
              </button>
              <button onClick={handleResetView} className="rounded-lg border border-white/[0.07] bg-white/[0.05] py-2 text-xs text-white/50 hover:bg-white/[0.1] transition flex items-center justify-center gap-1">
                <RotateCcw size={12} /> Reset
              </button>
              <button onClick={handleToggleBundle} className={`rounded-lg border py-2 text-xs transition flex items-center justify-center gap-1 ${
                isBundled ? "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]" : "border-white/[0.07] bg-white/[0.05] text-white/50 hover:bg-white/[0.1]"
              }`}>
                <Layers size={12} /> Bundle
              </button>
            </div>
          </div>

          {/* Detected Rings */}
          <div className="panel p-4 max-h-[350px] overflow-y-auto">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-white/30 flex items-center gap-1.5">
                <Network size={12} />
                Detected Rings ({rings.length})
              </div>
              {activeRing && (
                <button onClick={() => setActiveRing(null)} className="text-[10px] text-[#FF4500] hover:text-white flex items-center gap-1">
                  <X size={10} /> Clear
                </button>
              )}
            </div>
            {rings.length === 0 ? (
              <div className="text-xs text-white/25 py-2">No ring structures detected</div>
            ) : (
              <div className="space-y-2">
                {rings.map((ring) => (
                  <RingCard
                    key={ring.id}
                    ring={ring}
                    isActive={activeRing?.id === ring.id}
                    onClick={handleRingClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Center: 3D Graph ── */}
        <div ref={containerRef} className="panel relative h-[850px] overflow-hidden rounded-[20px]">
          {/* Active ring label */}
          {activeRing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full border border-orange/30 bg-black/80 backdrop-blur-xl px-4 py-2 text-xs text-orange flex items-center gap-2"
            >
              <Target size={12} />
              Isolating: {activeRing.label} ({activeRing.type})
              <button onClick={() => setActiveRing(null)} className="ml-2 text-white/40 hover:text-white"><X size={12} /></button>
            </motion.div>
          )}

          {/* Node count badge */}
          <div className="absolute top-4 right-4 z-20 rounded-xl border border-white/[0.07] bg-black/80 backdrop-blur-xl px-3 py-2 text-[10px] text-white/40">
            <span className="text-white font-semibold">{visibleGraph.nodes.length}</span> nodes ·{" "}
            <span className="text-white font-semibold">{visibleGraph.links.length}</span> edges
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/[0.07] bg-black/80 backdrop-blur-xl p-3 text-[10px]">
            <div className="text-white/30 uppercase tracking-[0.2em] mb-2 font-semibold">Legend</div>
            <div className="space-y-1.5">
              {Object.entries(NODE_COLORS).filter(([k]) => k !== "default").map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-white/50">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                  <span className="capitalize">{type}</span>
                </div>
              ))}
              {showRoles && (
                <>
                  <div className="border-t border-white/[0.05] pt-1.5 mt-1.5" />
                  {Object.entries(ROLE_COLORS).map(([role, color]) => (
                    <div key={role} className="flex items-center gap-2 text-white/50">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                      <span>{ROLE_ICONS[role]} {role}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 3D Graph */}
          <ForceGraph3DComp
            ref={fgRef}
            graphData={visibleGraph}
            width={dimensions.width || 800}
            height={dimensions.height || 850}
            backgroundColor="#050814"
            enableNodeDrag={false}
            linkWidth={getLinkWidth}
            linkColor={getLinkColor}
            linkOpacity={0.6}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={0.75}
            linkDirectionalParticles={showParticles ? 3 : 0}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={() => "rgba(96, 165, 250, 0.8)"}
            linkCurvature={0.1}
            d3ForceStrength={isBundled ? 0 : -180}
            d3VelocityDecay={isBundled ? 1 : 0.28}
            nodeLabel={getNodeLabel}
            nodeThreeObject={buildNodeObject}
            onNodeClick={handleNodeClick}
            onEngineStop={() => {
              if (!hasFitted.current) {
                fgRef.current?.zoomToFit(800);
                hasFitted.current = true;
              }
            }}
          />
        </div>

        {/* ── Right Panel: Node Inspector + Ring Stats ── */}
        <div className="space-y-4">
          {/* Node Inspector */}
          <AnimatePresence mode="wait">
            {activeNodeData ? (
              <motion.div
                key={activeNodeData.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="panel p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#FF4500] flex items-center gap-1.5">
                    <Shield size={12} />
                    Node Inspector
                  </div>
                  <button onClick={() => { setActiveNodeId(null); }} className="text-white/40 hover:text-white text-sm">✕</button>
                </div>

                <div className="font-display text-xl text-white mb-1">{activeNodeData.id}</div>
                <div className="text-xs text-white/40 mb-4">
                  {activeNodeData.bank || "Unknown Bank"} · {(activeNodeData.node_type || "unknown").toUpperCase()} · {activeNodeData.status || "active"}
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                    activeNodeData.is_anomalous ? "bg-red/10 border border-red/30 text-red" : "bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#FF4500]"
                  }`}>
                    {activeNodeData.is_anomalous ? "🔴 Anomalous" : "🟢 Normal"}
                  </span>
                  {activeNodeData.role && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] uppercase border" style={{
                      borderColor: ROLE_COLORS[activeNodeData.role] + "50",
                      background: ROLE_COLORS[activeNodeData.role] + "15",
                      color: ROLE_COLORS[activeNodeData.role],
                    }}>
                      {ROLE_ICONS[activeNodeData.role]} {activeNodeData.role}
                    </span>
                  )}
                </div>

                {/* ML scores */}
                {activeScore && (
                  <div className="space-y-2 mb-4">
                    <ScoreRow icon={<Brain size={12} />} label="GAT Score" value={`${((activeScore.gat_score ?? 0) * 100).toFixed(1)}%`} color={activeScore.gat_score > 0.7 ? "#ef4444" : "#5ee9d5"} />
                    <ScoreRow icon={<Activity size={12} />} label="LSTM Score" value={`${((activeScore.lstm_score ?? 0) * 100).toFixed(1)}%`} color={activeScore.lstm_score > 0.7 ? "#ef4444" : "#5ee9d5"} />
                    <ScoreRow icon={<AlertTriangle size={12} />} label="Risk Score" value={activeScore.risk_score?.toFixed(1) ?? "N/A"} color={activeScore.risk_score > 70 ? "#ef4444" : "#5ee9d5"} />
                  </div>
                )}

                {/* F1-F10 flags */}
                {activeScore?.flag_hits?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Flag Hits</div>
                    <div className="flex flex-wrap gap-1">
                      {activeScore.flag_hits.map((flag) => (
                        <span key={flag} className="rounded-lg border border-red/30 bg-red/10 px-2 py-0.5 text-[10px] text-red font-mono">{flag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account details */}
                <div className="space-y-1.5">
                  <DetailRow label="Risk Score" value={activeNodeData.risk_score ?? "N/A"} />
                  <DetailRow label="Balance" value={`₹${activeNodeData.balance?.toLocaleString?.() ?? "0"}`} />
                  <DetailRow label="Neighbors" value={focusData.neighborSet.size - 1} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="panel p-4"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-white/30 flex items-center gap-1.5 mb-3">
                  <Shield size={12} />
                  Node Inspector
                </div>
                <div className="text-center py-8 text-xs text-white/25">
                  <Hexagon size={24} className="mx-auto mb-2 opacity-30" />
                  Click a node in the 3D graph to inspect it
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ring Detection Stats */}
          <div className="panel p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30 flex items-center gap-1.5">
              <Target size={12} />
              Ring Detection Summary
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon="🔄" label="Cycles" value={stats.cyclesFound ?? 0} color="#ef4444" />
              <MiniStat icon="⭐" label="Stars" value={stats.starsFound ?? 0} color="#f59e0b" />
              <MiniStat icon="🔗" label="Chains" value={stats.chainsFound ?? 0} color="#8b5cf6" />
              <MiniStat icon="🕸️" label="Clusters" value={stats.denseClustersFound ?? 0} color="#ec4899" />
            </div>
          </div>

          {/* Role Distribution */}
          <div className="panel p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">Role Distribution</div>
            {(() => {
              const roleCounts = { HUB: 0, BRIDGE: 0, MULE: 0 };
              roles.forEach((role) => { if (roleCounts[role] !== undefined) roleCounts[role]++; });
              return (
                <div className="space-y-2">
                  {Object.entries(roleCounts).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-white/50">
                        <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[role] }} />
                        {ROLE_ICONS[role]} {role}
                      </div>
                      <div className="text-white font-semibold">{count}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Node Type Distribution */}
          <div className="panel p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">Node Types</div>
            {(() => {
              const typeCounts = {};
              (graph?.nodes || []).forEach((n) => {
                typeCounts[n.node_type] = (typeCounts[n.node_type] || 0) + 1;
              });
              return (
                <div className="space-y-2">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-white/50">
                        <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[type] || NODE_COLORS.default }} />
                        <span className="capitalize">{type}</span>
                      </div>
                      <div className="text-white font-semibold">{count}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ── */

function ScoreRow({ icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/40">
        {icon} {label}
      </div>
      <div className="font-display text-sm" style={{ color }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.01] px-3 py-1.5 text-xs">
      <span className="text-white/30">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value, color }) {
  return (
    <div
      className="rounded-xl border px-3 py-2 text-center"
      style={{ borderColor: color + "30", background: color + "08" }}
    >
      <div className="text-base mb-0.5">{icon}</div>
      <div className="font-display text-lg text-white">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color }}>{label}</div>
    </div>
  );
}
