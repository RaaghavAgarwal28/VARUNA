import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "../../lib/format";

/* ── SVG paths for major Indian states (simplified outlines) ── */
const STATE_PATHS = {
  "Maharashtra": "M105 240 L140 225 L165 235 L175 260 L170 290 L150 310 L120 300 L100 275 Z",
  "Telangana": "M155 275 L185 265 L200 280 L195 300 L170 305 L155 295 Z",
  "Karnataka": "M110 300 L155 295 L170 305 L175 340 L150 360 L115 345 L105 315 Z",
  "Tamil Nadu": "M150 360 L175 340 L200 350 L195 385 L170 400 L145 385 Z",
  "Kerala": "M120 360 L145 385 L140 410 L125 415 L115 390 Z",
  "Andhra Pradesh": "M170 305 L195 300 L215 280 L230 295 L220 330 L195 350 L175 340 Z",
  "West Bengal": "M235 190 L255 170 L270 185 L265 225 L245 240 L230 220 Z",
  "Delhi": "M155 140 L170 135 L175 150 L165 155 Z",
  "Haryana": "M140 120 L170 115 L175 135 L155 145 L135 140 Z",
  "Rajasthan": "M80 130 L140 120 L145 170 L120 200 L80 190 L65 160 Z",
  "Uttar Pradesh": "M170 135 L235 130 L250 155 L235 185 L190 190 L170 170 Z",
  "Gujarat": "M55 185 L80 190 L100 215 L105 240 L85 255 L55 235 L45 210 Z",
  "Madhya Pradesh": "M105 200 L170 190 L190 195 L185 230 L165 235 L120 225 Z",
  "Bihar": "M230 170 L265 165 L270 185 L255 190 L235 185 Z",
  "Odisha": "M210 250 L240 240 L255 260 L245 290 L220 285 L210 265 Z",
  "Punjab": "M125 95 L150 90 L155 115 L140 120 L120 110 Z",
  "Assam": "M290 155 L320 145 L330 165 L315 175 L290 170 Z",
  "Jharkhand": "M235 210 L265 200 L270 225 L250 235 L235 225 Z",
  "Chhattisgarh": "M185 230 L210 225 L220 250 L210 280 L190 270 Z",
  "Goa": "M110 315 L125 310 L125 330 L115 335 Z",
  "Uttarakhand": "M175 90 L205 85 L210 110 L190 115 L175 105 Z",
};

/* ── State center positions for labels ── */
const STATE_CENTERS = {
  "Maharashtra": { x: 140, y: 265 },
  "Telangana": { x: 175, y: 285 },
  "Karnataka": { x: 140, y: 325 },
  "Tamil Nadu": { x: 172, y: 370 },
  "Kerala": { x: 128, y: 390 },
  "Andhra Pradesh": { x: 200, y: 315 },
  "West Bengal": { x: 250, y: 205 },
  "Delhi": { x: 165, y: 145 },
  "Haryana": { x: 152, y: 130 },
  "Rajasthan": { x: 100, y: 160 },
  "Uttar Pradesh": { x: 205, y: 160 },
  "Gujarat": { x: 72, y: 220 },
  "Madhya Pradesh": { x: 150, y: 215 },
  "Bihar": { x: 248, y: 178 },
  "Odisha": { x: 232, y: 265 },
  "Punjab": { x: 138, y: 105 },
  "Assam": { x: 308, y: 160 },
  "Jharkhand": { x: 250, y: 218 },
  "Chhattisgarh": { x: 200, y: 255 },
  "Goa": { x: 117, y: 322 },
  "Uttarakhand": { x: 192, y: 100 },
};

/* ── Simulated district data ── */
const DISTRICT_DATA = {
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
  "Delhi": [
    { name: "Central Delhi", branches: 312, suspicious: 6, frozen: 2, exposure: 78000, banks: ["SBI", "BOB", "PNB"] },
    { name: "South Delhi", branches: 287, suspicious: 4, frozen: 1, exposure: 56000, banks: ["HDFC", "Axis"] },
    { name: "NCR (Noida/Gurgaon)", branches: 445, suspicious: 8, frozen: 3, exposure: 92000, banks: ["IndusInd", "HDFC", "Yes"] },
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
};

// Fill in missing states with generic data
Object.keys(STATE_PATHS).forEach((s) => {
  if (!DISTRICT_DATA[s]) {
    DISTRICT_DATA[s] = [
      { name: `${s} Urban`, branches: 45 + Math.floor(Math.random() * 200), suspicious: Math.floor(Math.random() * 3), frozen: 0, exposure: 5000 + Math.floor(Math.random() * 20000), banks: ["SBI"] },
    ];
  }
});

const threatColor = {
  Severe: { fill: "rgba(255,95,121,0.25)", stroke: "#ff5f79", text: "#ff5f79" },
  High: { fill: "rgba(255,157,67,0.2)", stroke: "#ff9d43", text: "#ff9d43" },
  Elevated: { fill: "rgba(125,226,209,0.12)", stroke: "rgba(125,226,209,0.4)", text: "#7de2d1" },
  none: { fill: "rgba(125,226,209,0.05)", stroke: "rgba(125,226,209,0.15)", text: "#475569" },
};

export function IndiaNetworkMap({ stateIntel }) {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);

  const stateDataMap = useMemo(() => {
    const map = {};
    (stateIntel || []).forEach((s) => {
      map[s.state] = s;
    });
    return map;
  }, [stateIntel]);

  const getThreatLevel = (stateName) => {
    const data = stateDataMap[stateName];
    return data?.threatLevel || "none";
  };

  const handleStateClick = (stateName) => {
    setSelectedState(stateName);
    setSelectedDistrict(null);
  };

  const handleDistrictClick = (district) => {
    setSelectedDistrict(district);
  };

  const stateData = selectedState ? stateDataMap[selectedState] : null;
  const districts = selectedState ? (DISTRICT_DATA[selectedState] || []) : [];

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">India Banking Network Intelligence</div>
          <div className="text-sm text-slate-400">
            Click any state to see banking details · Click district to drill down further
          </div>
        </div>
        {selectedState && (
          <button
            onClick={() => { setSelectedState(null); setSelectedDistrict(null); }}
            className="rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-cyan transition-colors hover:bg-cyan/20"
          >
            ← Back to Map
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* ── SVG Map ── */}
        <div className="relative overflow-hidden rounded-[28px] border border-line/70 bg-[radial-gradient(circle_at_center,rgba(89,167,255,0.08),transparent_60%),linear-gradient(180deg,rgba(3,11,25,0.6),rgba(3,11,25,0.95))] p-4">
          <svg viewBox="30 60 320 380" className="mx-auto h-[480px] w-full">
            {/* State polygons */}
            {Object.entries(STATE_PATHS).map(([stateName, path]) => {
              const level = getThreatLevel(stateName);
              const colors = threatColor[level];
              const isSelected = selectedState === stateName;
              const isHovered = hoveredState === stateName;

              return (
                <g key={stateName}>
                  <path
                    d={path}
                    fill={isSelected ? colors.stroke + "55" : isHovered ? colors.fill.replace("0.", "0.4") : colors.fill}
                    stroke={isSelected ? "#ffffff" : colors.stroke}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => handleStateClick(stateName)}
                    onMouseEnter={() => setHoveredState(stateName)}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                  {/* State label */}
                  {STATE_CENTERS[stateName] && (
                    <text
                      x={STATE_CENTERS[stateName].x}
                      y={STATE_CENTERS[stateName].y}
                      textAnchor="middle"
                      fontSize={stateName.length > 10 ? 6 : 7}
                      fill={isSelected || isHovered ? "#ffffff" : colors.text}
                      fontFamily="Space Grotesk"
                      fontWeight={isSelected ? "700" : "500"}
                      className="pointer-events-none select-none"
                    >
                      {stateName.length > 14 ? stateName.substring(0, 12) + ".." : stateName}
                    </text>
                  )}
                  {/* Threat dot indicator */}
                  {stateDataMap[stateName] && STATE_CENTERS[stateName] && (
                    <circle
                      cx={STATE_CENTERS[stateName].x}
                      cy={STATE_CENTERS[stateName].y - 12}
                      r={level === "Severe" ? 4 : level === "High" ? 3 : 2}
                      fill={colors.stroke}
                      className="pointer-events-none"
                    >
                      {level === "Severe" && (
                        <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
                      )}
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Connection lines between affected states */}
            {stateIntel && stateIntel.length > 1 && stateIntel.map((state, i) => {
              const nextState = stateIntel[(i + 1) % stateIntel.length];
              const from = STATE_CENTERS[state.state];
              const to = STATE_CENTERS[nextState?.state];
              if (!from || !to) return null;
              return (
                <line
                  key={`conn-${i}`}
                  x1={from.x} y1={from.y - 15}
                  x2={to.x} y2={to.y - 15}
                  stroke="rgba(255, 95, 121, 0.2)"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            })}
          </svg>

          {/* Hovered state tooltip */}
          <AnimatePresence>
            {hoveredState && stateDataMap[hoveredState] && !selectedState && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute left-4 bottom-4 rounded-2xl border border-line/70 bg-black/90 px-4 py-3 text-sm backdrop-blur-xl"
              >
                <div className="font-display text-lg text-white">{hoveredState}</div>
                <div className="mt-1 text-slate-400">
                  Exposure: {formatCurrency(stateDataMap[hoveredState].totalExposure)} · 
                  {stateDataMap[hoveredState].suspiciousAccounts} suspicious · 
                  {stateDataMap[hoveredState].frozenAccounts} frozen
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ff5f79]" />Severe</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ff9d43]" />High</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#7de2d1]" />Elevated</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#475569]" />Normal</span>
          </div>
        </div>

        {/* ── Detail Panel ── */}
        <div className="space-y-4">
          {!selectedState ? (
            /* Summary view when no state selected */
            <div className="space-y-3">
              <div className="rounded-[20px] border border-line/70 bg-white/[0.02] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Affected States Overview</div>
                {(stateIntel || []).map((state) => {
                  const colors = threatColor[state.threatLevel];
                  return (
                    <div
                      key={state.state}
                      onClick={() => handleStateClick(state.state)}
                      className="flex items-center justify-between rounded-xl border border-line/50 bg-white/[0.01] p-3 mb-2 cursor-pointer transition-colors hover:bg-white/[0.04] hover:border-cyan/30"
                    >
                      <div>
                        <div className="font-semibold text-white">{state.state}</div>
                        <div className="text-xs text-slate-400">{state.banks.length} banks · {state.suspiciousAccounts} suspicious</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-white">{formatCurrency(state.totalExposure)}</div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest`} style={{ borderColor: colors.stroke + "50", color: colors.text }}>{state.threatLevel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* State detail view */
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedState}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* State header */}
                <div className="rounded-[20px] border border-line/70 bg-white/[0.02] p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-display text-2xl text-white">{selectedState}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {stateData?.banks.length || 0} linked banks · {districts.length} districts monitored
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]`}
                      style={{
                        borderColor: threatColor[stateData?.threatLevel || "none"].stroke + "50",
                        color: threatColor[stateData?.threatLevel || "none"].text,
                        background: threatColor[stateData?.threatLevel || "none"].fill,
                      }}>
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
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Linked Banks</div>
                      <div className="flex flex-wrap gap-2">
                        {stateData.banks.map((bank) => (
                          <span key={bank} className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-slate-300">{bank}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stateData?.anomalies && stateData.anomalies.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Anomaly Signatures</div>
                      <div className="space-y-1">
                        {stateData.anomalies.map((a) => (
                          <div key={a} className="rounded-lg border border-red/20 bg-red/5 px-3 py-1.5 text-xs text-red">⚠ {a}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* District breakdown */}
                <div className="rounded-[20px] border border-line/70 bg-white/[0.02] p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">District-Level Breakdown</div>
                  <div className="space-y-2">
                    {districts.map((district) => (
                      <div
                        key={district.name}
                        onClick={() => handleDistrictClick(district)}
                        className={`rounded-xl border p-3 cursor-pointer transition-all ${
                          selectedDistrict?.name === district.name
                            ? "border-cyan/50 bg-cyan/5"
                            : "border-line/50 bg-white/[0.01] hover:bg-white/[0.04] hover:border-cyan/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-white">{district.name}</div>
                          <div className="text-sm text-slate-300">{formatCurrency(district.exposure)}</div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>🏦 {district.branches} branches</span>
                          <span className={district.suspicious > 0 ? "text-orange" : ""}>⚠ {district.suspicious} suspicious</span>
                          <span className={district.frozen > 0 ? "text-red" : ""}>🔒 {district.frozen} frozen</span>
                        </div>

                        {/* Expanded district details */}
                        <AnimatePresence>
                          {selectedDistrict?.name === district.name && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 overflow-hidden"
                            >
                              <div className="rounded-lg border border-line/50 bg-black/30 p-3">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Banks Operating</div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {district.banks.map((b) => (
                                    <span key={b} className="rounded-full border border-cyan/20 bg-cyan/5 px-2 py-0.5 text-[11px] text-cyan">{b}</span>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-lg border border-line/40 bg-slate-950/30 p-2">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Risk Density</div>
                                    <div className="mt-1 font-display text-lg text-white">
                                      {district.branches > 0
                                        ? ((district.suspicious / district.branches) * 100).toFixed(1)
                                        : 0}%
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-line/40 bg-slate-950/30 p-2">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Avg Exposure/Branch</div>
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
    <div className="rounded-xl border border-line/60 bg-slate-950/30 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1 font-display text-lg text-white">{value}</div>
    </div>
  );
}
