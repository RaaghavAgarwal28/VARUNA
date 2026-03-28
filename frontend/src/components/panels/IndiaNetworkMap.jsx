import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { geoMercator, geoPath } from "d3-geo";
import { formatCurrency } from "../../lib/format";

/* ── Threat color mapping ── */
const threatColor = {
  Severe: { fill: "rgba(255,95,121,0.35)", stroke: "#ff5f79", text: "#ff5f79", glow: "rgba(255,95,121,0.5)" },
  High: { fill: "rgba(255,157,67,0.25)", stroke: "#ff9d43", text: "#ff9d43", glow: "rgba(255,157,67,0.4)" },
  Elevated: { fill: "rgba(255,69,0,0.15)", stroke: "rgba(255,69,0,0.5)", text: "#FF4500", glow: "rgba(255,69,0,0.3)" },
  none: { fill: "rgba(255,69,0,0.06)", stroke: "rgba(255,69,0,0.18)", text: "#475569", glow: "transparent" },
};

/* ── District intel (simulated per-district data) ── */
const DISTRICT_INTEL = {
  "Maharashtra": [
    { name: "Mumbai", branches: 847, suspicious: 12, frozen: 3, exposure: 125000, banks: ["SBI", "HDFC", "Axis"] },
    { name: "Pune", branches: 342, suspicious: 8, frozen: 2, exposure: 89000, banks: ["Kotak", "SBI", "ICICI"] },
    { name: "Nagpur", branches: 198, suspicious: 3, frozen: 0, exposure: 22000, banks: ["SBI", "PNB"] },
    { name: "Thane", branches: 265, suspicious: 5, frozen: 1, exposure: 45000, banks: ["HDFC", "Axis"] },
  ],
  "Telangana": [
    { name: "Hyderabad", branches: 562, suspicious: 9, frozen: 4, exposure: 98000, banks: ["Axis", "SBI", "HDFC"] },
    { name: "Warangal", branches: 87, suspicious: 2, frozen: 0, exposure: 15000, banks: ["SBI", "PNB"] },
    { name: "Nizamabad", branches: 54, suspicious: 1, frozen: 0, exposure: 8000, banks: ["SBI"] },
  ],
  "Karnataka": [
    { name: "Bengaluru", branches: 723, suspicious: 11, frozen: 3, exposure: 115000, banks: ["HDFC", "SBI", "Canara"] },
    { name: "Mysuru", branches: 145, suspicious: 2, frozen: 0, exposure: 18000, banks: ["SBI", "Canara"] },
    { name: "Mangaluru", branches: 112, suspicious: 1, frozen: 0, exposure: 12000, banks: ["Canara", "SBI"] },
  ],
  "West Bengal": [
    { name: "Kolkata", branches: 489, suspicious: 14, frozen: 5, exposure: 145000, banks: ["ICICI", "PNB", "SBI"] },
    { name: "Howrah", branches: 156, suspicious: 4, frozen: 1, exposure: 35000, banks: ["SBI", "PNB"] },
    { name: "Siliguri", branches: 78, suspicious: 1, frozen: 0, exposure: 9000, banks: ["SBI"] },
  ],
  "NCT of Delhi": [
    { name: "Central Delhi", branches: 312, suspicious: 6, frozen: 2, exposure: 78000, banks: ["SBI", "BOB", "PNB"] },
    { name: "South Delhi", branches: 287, suspicious: 4, frozen: 1, exposure: 56000, banks: ["HDFC", "Axis"] },
    { name: "New Delhi", branches: 445, suspicious: 8, frozen: 3, exposure: 92000, banks: ["IndusInd", "HDFC", "Yes"] },
  ],
  "Haryana": [
    { name: "Gurugram", branches: 234, suspicious: 7, frozen: 2, exposure: 85000, banks: ["Yes Bank", "HDFC"] },
    { name: "Faridabad", branches: 123, suspicious: 2, frozen: 0, exposure: 18000, banks: ["SBI", "PNB"] },
  ],
  "Rajasthan": [
    { name: "Jaipur", branches: 312, suspicious: 5, frozen: 1, exposure: 52000, banks: ["Canara", "SBI"] },
    { name: "Udaipur", branches: 89, suspicious: 1, frozen: 0, exposure: 8000, banks: ["SBI"] },
    { name: "Jodhpur", branches: 76, suspicious: 1, frozen: 0, exposure: 6000, banks: ["SBI", "PNB"] },
  ],
  "Tamil Nadu": [
    { name: "Chennai", branches: 534, suspicious: 7, frozen: 2, exposure: 88000, banks: ["IOB", "SBI", "ICICI"] },
    { name: "Coimbatore", branches: 178, suspicious: 3, frozen: 1, exposure: 32000, banks: ["SBI", "Canara"] },
  ],
  "Uttar Pradesh": [
    { name: "Lucknow", branches: 289, suspicious: 6, frozen: 2, exposure: 67000, banks: ["SBI", "PNB", "BOB"] },
    { name: "Noida", branches: 312, suspicious: 9, frozen: 3, exposure: 95000, banks: ["HDFC", "Axis", "IndusInd"] },
    { name: "Varanasi", branches: 134, suspicious: 2, frozen: 0, exposure: 18000, banks: ["SBI", "PNB"] },
  ],
  "Gujarat": [
    { name: "Ahmedabad", branches: 423, suspicious: 6, frozen: 2, exposure: 72000, banks: ["SBI", "BOB", "HDFC"] },
    { name: "Surat", branches: 267, suspicious: 4, frozen: 1, exposure: 45000, banks: ["SBI", "Axis"] },
  ],
};

/* ── Helpers ── */
function getStateName(feature) {
  const p = feature.properties;
  return p.NAME_1 || p.st_nm || p.name || p.NAME || "";
}

function getDistrictName(feature) {
  const p = feature.properties;
  return p.NAME_2 || p.dtname || p.district || p.NAME || "";
}

/* ── Normalize state names for matching ── */
const STATE_NAME_MAP = {
  "delhi": "NCT of Delhi",
  "nct of delhi": "NCT of Delhi",
  "andhra pradesh": "Andhra Pradesh",
  "arunachal pradesh": "Arunachal Pradesh",
};

function normalizeStateName(name) {
  const lower = (name || "").toLowerCase().trim();
  return STATE_NAME_MAP[lower] || name;
}

export function IndiaNetworkMap({ stateIntel }) {
  const [statesGeo, setStatesGeo] = useState(null);
  const [districtsGeo, setDistrictsGeo] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  /* ── Load GeoJSON data ── */
  useEffect(() => {
    fetch("/data/india_states.geojson")
      .then((r) => r.json())
      .then(setStatesGeo)
      .catch(() => console.warn("Could not load states GeoJSON"));
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetch("/data/india_districts.geojson")
        .then((r) => r.json())
        .then(setDistrictsGeo)
        .catch(() => console.warn("Could not load districts GeoJSON"));
    }
  }, [selectedState]);

  /* ── State intel map (name → data) ── */
  const stateDataMap = useMemo(() => {
    const map = {};
    (stateIntel || []).forEach((s) => {
      if (s && s.state) {
        map[s.state] = s;
        map[s.state.toLowerCase()] = s;
      }
    });
    return map;
  }, [stateIntel]);

  /* ── D3 Projection for all of India ── */
  const indiaProjection = useMemo(() => {
    return geoMercator()
      .center([82, 22])
      .scale(900)
      .translate([300, 300]);
  }, []);

  const pathGenerator = useMemo(() => geoPath().projection(indiaProjection), [indiaProjection]);

  /* ── Zoomed projection for a selected state ── */
  const stateProjection = useMemo(() => {
    if (!selectedState || !statesGeo) return null;
    const feature = statesGeo.features.find(
      (f) => getStateName(f).toLowerCase() === selectedState.toLowerCase()
    );
    if (!feature) return null;

    const bounds = geoPath().projection(indiaProjection).bounds(feature);
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const cx = (bounds[0][0] + bounds[1][0]) / 2;
    const cy = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.min(560 / dx, 520 / dy) * 0.85;
    const translate = [300 - cx * scale, 280 - cy * scale];

    return { scale, translate };
  }, [selectedState, statesGeo, indiaProjection]);

  /* ── Filter districts for the selected state ── */
  const filteredDistricts = useMemo(() => {
    if (!selectedState || !districtsGeo) return [];
    return districtsGeo.features.filter((f) => {
      const stateProp = f.properties.NAME_1 || f.properties.st_nm || "";
      return stateProp.toLowerCase() === selectedState.toLowerCase();
    });
  }, [selectedState, districtsGeo]);

  /* ── Get threat level for a state ── */
  const getThreat = useCallback(
    (stateName) => {
      const data = stateDataMap[stateName] || stateDataMap[stateName?.toLowerCase()];
      return data?.threatLevel || "none";
    },
    [stateDataMap]
  );

  const handleStateClick = (stateName) => {
    setSelectedState(stateName);
    setSelectedDistrict(null);
    setHoveredFeature(null);
  };

  const handleBack = () => {
    setSelectedState(null);
    setSelectedDistrict(null);
    setHoveredFeature(null);
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const stateData = selectedState ? (stateDataMap[selectedState] || stateDataMap[selectedState?.toLowerCase()]) : null;
  const districtIntel = selectedState ? (DISTRICT_INTEL[selectedState] || []) : [];

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">
            {selectedState
              ? `${selectedState} — District Intelligence`
              : "India Banking Network Intelligence"}
          </div>
          <div className="text-sm text-white/40">
            {selectedState
              ? `${filteredDistricts.length} districts mapped · Click to see banking details`
              : "Real GeoJSON boundaries · Click any state to drill down into districts"}
          </div>
        </div>
        {selectedState && (
          <button
            onClick={handleBack}
            className="rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[#FF4500] transition-colors hover:bg-[#FF4500]/20"
          >
            ← Back to India
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* ── Real GeoJSON Map ── */}
        <div
          className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.06),transparent_60%),linear-gradient(180deg,rgba(0,0,0,0.7),rgba(0,0,0,0.95))]"
          style={{ minHeight: 540 }}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 600 580"
            className="mx-auto h-full w-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredFeature(null)}
          >
            <defs>
              {/* Glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowStrong" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ── Render States (overview mode) ── */}
            {!selectedState &&
              statesGeo &&
              statesGeo.features.map((feature, i) => {
                const stateName = getStateName(feature);
                const d = pathGenerator(feature);
                if (!d) return null;

                const level = getThreat(stateName);
                const colors = threatColor[level];
                const isHovered = hoveredFeature === stateName;

                return (
                  <g key={`state-${i}`}>
                    {/* Glow behind severe/high states */}
                    {(level === "Severe" || level === "High") && (
                      <path
                        d={d}
                        fill={colors.glow}
                        stroke="none"
                        filter="url(#glowStrong)"
                        className="pointer-events-none"
                        opacity={0.4}
                      />
                    )}
                    <path
                      d={d}
                      fill={isHovered ? colors.fill.replace(/[\d.]+\)$/, "0.5)") : colors.fill}
                      stroke={isHovered ? "#ffffff" : colors.stroke}
                      strokeWidth={isHovered ? 1.8 : 0.7}
                      className="cursor-pointer transition-all duration-150"
                      onClick={() => handleStateClick(stateName)}
                      onMouseEnter={() => setHoveredFeature(stateName)}
                      onMouseLeave={() => setHoveredFeature(null)}
                    />
                  </g>
                );
              })}

            {/* ── Render Districts (drill-down mode) ── */}
            {selectedState &&
              stateProjection &&
              filteredDistricts.map((feature, i) => {
                const distName = getDistrictName(feature);
                const d = pathGenerator(feature);
                if (!d) return null;

                const isHovered = hoveredFeature === distName;
                const isSelected = selectedDistrict?.name === distName;

                // Apply zoom transform
                const transform = `translate(${stateProjection.translate[0]}, ${stateProjection.translate[1]}) scale(${stateProjection.scale})`;

                return (
                  <g
                    key={`dist-${i}`}
                    style={{
                      transform: `translate(${stateProjection.translate[0]}px, ${stateProjection.translate[1]}px) scale(${stateProjection.scale})`,
                      transformOrigin: "0 0",
                    }}
                  >
                    <path
                      d={d}
                      fill={
                        isSelected
                          ? "rgba(255,69,0,0.3)"
                          : isHovered
                          ? "rgba(255,69,0,0.25)"
                          : "rgba(255,69,0,0.08)"
                      }
                      stroke={
                        isSelected
                          ? "#59a7ff"
                          : isHovered
                          ? "rgba(255,69,0,0.7)"
                          : "rgba(255,69,0,0.25)"
                      }
                      strokeWidth={isSelected ? 2 / stateProjection.scale : isHovered ? 1.2 / stateProjection.scale : 0.5 / stateProjection.scale}
                      className="cursor-pointer transition-colors duration-150"
                      onClick={() => {
                        const intel = districtIntel.find((d) =>
                          distName.toLowerCase().includes(d.name.toLowerCase()) ||
                          d.name.toLowerCase().includes(distName.toLowerCase())
                        );
                        setSelectedDistrict(
                          intel || { name: distName, branches: Math.floor(Math.random() * 200) + 30, suspicious: Math.floor(Math.random() * 5), frozen: Math.floor(Math.random() * 2), exposure: Math.floor(Math.random() * 50000) + 5000, banks: ["SBI"] }
                        );
                      }}
                      onMouseEnter={() => setHoveredFeature(distName)}
                      onMouseLeave={() => setHoveredFeature(null)}
                    />
                  </g>
                );
              })}

            {/* ── State Labels (overview mode) ── */}
            {!selectedState &&
              statesGeo &&
              statesGeo.features.map((feature, i) => {
                const stateName = getStateName(feature);
                const centroid = pathGenerator.centroid(feature);
                if (!centroid || isNaN(centroid[0])) return null;

                const level = getThreat(stateName);
                if (level === "none") return null; // Only label states with data

                return (
                  <text
                    key={`label-${i}`}
                    x={centroid[0]}
                    y={centroid[1]}
                    textAnchor="middle"
                    fontSize={7}
                    fill={threatColor[level].text}
                    fontFamily="Space Grotesk"
                    fontWeight="600"
                    className="pointer-events-none select-none"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                  >
                    {stateName.length > 15 ? stateName.substring(0, 13) + ".." : stateName}
                  </text>
                );
              })}
          </svg>

          {/* ── Hover Tooltip ── */}
          <AnimatePresence>
            {hoveredFeature && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/[0.07] bg-black/90 px-4 py-3 text-sm backdrop-blur-xl"
              >
                <div className="font-display text-base text-white">{hoveredFeature}</div>
                {!selectedState && stateDataMap[hoveredFeature] && (
                  <div className="mt-1 text-white/40">
                    Exposure: {formatCurrency(stateDataMap[hoveredFeature].totalExposure)} ·{" "}
                    {stateDataMap[hoveredFeature].suspiciousAccounts} suspicious ·{" "}
                    {stateDataMap[hoveredFeature].frozenAccounts} frozen
                  </div>
                )}
                {selectedState && (
                  <div className="mt-1 text-xs text-white/30">Click to see district details</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/40">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff5f79] shadow-[0_0_6px_rgba(255,95,121,0.6)]" />Severe</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff9d43]" />High</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF4500]" />Elevated</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#475569]" />Normal</span>
          </div>
        </div>

        {/* ── Detail Panel ── */}
        <div className="space-y-4 max-h-[580px] overflow-y-auto custom-scrollbar">
          {!selectedState ? (
            <div className="space-y-3">
              <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/30 mb-3">
                  Affected States Overview
                </div>
                {(stateIntel || []).map((state) => {
                  const colors = threatColor[state.threatLevel];
                  return (
                    <div
                      key={state.state}
                      onClick={() => handleStateClick(state.state)}
                      className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.01] p-3 mb-2 cursor-pointer transition-colors hover:bg-white/[0.04] hover:border-[#FF4500]/30"
                    >
                      <div>
                        <div className="font-semibold text-white">{state.state}</div>
                        <div className="text-xs text-white/40">
                          {state.banks?.length || 0} banks · {state.suspiciousAccounts} suspicious
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-white">
                          {formatCurrency(state.totalExposure)}
                        </div>
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest"
                          style={{ borderColor: colors.stroke + "50", color: colors.text }}
                        >
                          {state.threatLevel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedState}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* State header */}
                <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-display text-2xl text-white">{selectedState}</div>
                      <div className="mt-1 text-sm text-white/40">
                        {stateData?.banks?.length || 0} linked banks · {districtIntel.length} key districts
                      </div>
                    </div>
                    <span
                      className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                      style={{
                        borderColor: threatColor[stateData?.threatLevel || "none"].stroke + "50",
                        color: threatColor[stateData?.threatLevel || "none"].text,
                        background: threatColor[stateData?.threatLevel || "none"].fill,
                      }}
                    >
                      {stateData?.threatLevel || "Normal"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <StatMetric label="Exposure" value={formatCurrency(stateData?.totalExposure || 0)} />
                    <StatMetric label="Suspicious" value={stateData?.suspiciousAccounts || 0} />
                    <StatMetric label="Frozen" value={stateData?.frozenAccounts || 0} />
                  </div>

                  {stateData?.banks && (
                    <div className="mt-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Linked Banks</div>
                      <div className="flex flex-wrap gap-2">
                        {stateData.banks.map((bank) => (
                          <span key={bank} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-xs text-white/50">{bank}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stateData?.anomalies && stateData.anomalies.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Anomaly Signatures</div>
                      <div className="space-y-1">
                        {stateData.anomalies.map((a) => (
                          <div key={a} className="rounded-lg border border-red/20 bg-red/5 px-3 py-1.5 text-xs text-red">⚠ {a}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* District breakdown */}
                <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/30 mb-3">
                    District-Level Breakdown
                  </div>
                  <div className="space-y-2">
                    {districtIntel.map((district) => (
                      <div
                        key={district.name}
                        onClick={() => setSelectedDistrict(district)}
                        className={`rounded-xl border p-3 cursor-pointer transition-all ${
                          selectedDistrict?.name === district.name
                            ? "border-[#FF4500]/50 bg-[#FF4500]/5"
                            : "border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.04] hover:border-[#FF4500]/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-white">{district.name}</div>
                          <div className="text-sm text-white/50">{formatCurrency(district.exposure)}</div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>🏦 {district.branches} branches</span>
                          <span className={district.suspicious > 0 ? "text-orange" : ""}>
                            ⚠ {district.suspicious} suspicious
                          </span>
                          <span className={district.frozen > 0 ? "text-red" : ""}>
                            🔒 {district.frozen} frozen
                          </span>
                        </div>

                        <AnimatePresence>
                          {selectedDistrict?.name === district.name && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 overflow-hidden"
                            >
                              <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Banks Operating</div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {district.banks.map((b) => (
                                    <span key={b} className="rounded-full border border-[#FF4500]/20 bg-[#FF4500]/5 px-2 py-0.5 text-[11px] text-[#FF4500]">{b}</span>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.03] p-2">
                                    <div className="text-[9px] uppercase tracking-widest text-white/30">Risk Density</div>
                                    <div className="mt-1 font-display text-lg text-white">
                                      {district.branches > 0 ? ((district.suspicious / district.branches) * 100).toFixed(1) : 0}%
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.03] p-2">
                                    <div className="text-[9px] uppercase tracking-widest text-white/30">Avg Exposure/Branch</div>
                                    <div className="mt-1 font-display text-lg text-white">
                                      {formatCurrency(district.branches > 0 ? Math.round(district.exposure / district.branches) : 0)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function StatMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">{label}</div>
      <div className="mt-1 font-display text-lg text-white">{value}</div>
    </div>
  );
}
