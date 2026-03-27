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
        <div className="text-sm text-slate-400">Investigator-ready action package</div>
      </div>
      <div className="rounded-2xl border border-line/70 bg-white/[0.02] p-4">
        <div className="mb-2 font-semibold text-white">{caseItem.title}</div>
        <div className="text-sm text-slate-400">
          Includes case summary, chain narrative, risk table, timeline, freeze actions, and recoverability estimate.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={htmlHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan transition hover:bg-cyan/20"
          >
            Open HTML Brief
          </a>
          <a
            href={jsonHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/[0.08]"
          >
            Open JSON Brief
          </a>
        </div>
      </div>
    </div>
  );
}
