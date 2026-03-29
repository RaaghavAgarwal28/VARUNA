import { lazy, Suspense } from 'react';
import { getBackendOrigin } from "../../lib/api";

const CrystalShader = lazy(() => import("../ui/CrystalShader"));

export function BriefPanel({ brief, caseItem }) {
  const backendOrigin = getBackendOrigin();
  const htmlHref = brief.html_report_path.startsWith("/reports/demo")
    ? brief.html_report_path
    : `${backendOrigin}${brief.html_report_path}`;
  const jsonHref = brief.json_report_path.startsWith("/reports/demo")
    ? brief.json_report_path
    : `${backendOrigin}${brief.json_report_path}`;

  return (
    <div className="panel p-0 h-full flex flex-col overflow-hidden">
      {/* Crystal shader visual background */}
      <div className="relative flex-1 min-h-[280px] overflow-hidden rounded-t-[20px]">
        <Suspense fallback={
          <div className="w-full h-full bg-gradient-to-br from-[#0a0f1e] via-[#0d1528] to-[#050814]" />
        }>
          <CrystalShader
            cellDensity={6.0}
            animationSpeed={0.12}
            warpFactor={0.5}
            mouseInfluence={0.08}
          />
        </Suspense>

        {/* Overlay content on top of shader */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center">
          <div className="rounded-full border border-[#FF4500]/30 bg-[#FF4500]/15 px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#FF4500] mb-4 backdrop-blur-sm">
            Enforcement Report Ready
          </div>
          <div className="font-display text-xl font-bold text-white mb-1 drop-shadow-lg">
            {caseItem.title?.split("—")[0]?.trim() || "VARUNA Brief"}
          </div>
          <div className="text-xs text-white/50 max-w-[280px]">
            Includes chain narrative, risk table, timeline, freeze actions & recoverability estimate
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="p-5 border-t border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="panel-heading text-sm">VARUNA Brief</div>
            <div className="text-[0.7rem] text-white/30">Investigator-ready action package</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#FF4500] animate-pulse" />
            <span className="text-[0.65rem] uppercase tracking-[0.15em] text-[#FF4500] font-semibold">Live</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={htmlHref}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-2.5 text-xs uppercase tracking-[0.15em] text-[#FF4500] font-semibold transition hover:bg-[#FF4500]/20 hover:border-[#FF4500]/50"
          >
            Open HTML Brief
          </a>
          <a
            href={jsonHref}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-xs uppercase tracking-[0.15em] text-slate-200 font-semibold transition hover:bg-white/[0.08]"
          >
            Open JSON Brief
          </a>
        </div>
      </div>
    </div>
  );
}
