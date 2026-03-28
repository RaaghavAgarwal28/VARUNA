import { getBackendOrigin } from "../../lib/api";

export function BriefPanel({ brief, caseItem }) {
  const backendOrigin = getBackendOrigin();
  const htmlHref = brief.html_report_path.startsWith("/reports/demo")
    ? brief.html_report_path
    : `${backendOrigin}${brief.html_report_path}`;
  const jsonHref = brief.json_report_path.startsWith("/reports/demo")
    ? brief.json_report_path
    : `${backendOrigin}${brief.json_report_path}`;

  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="panel-heading">VARUNA Brief</div>
        <div className="text-sm text-white/40">Investigator-ready action package</div>
      </div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-2 font-semibold text-white">{caseItem.title}</div>
        <div className="text-sm text-white/40">
          Includes case summary, chain narrative, risk table, timeline, freeze actions, and recoverability estimate.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={htmlHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#FF4500] transition hover:bg-[#FF4500]/20"
          >
            Open HTML Brief
          </a>
          <a
            href={jsonHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/[0.08]"
          >
            Open JSON Brief
          </a>
        </div>
      </div>
    </div>
  );
}
