from __future__ import annotations

import json
from pathlib import Path

from app.core.config import REPORTS_DIR


def generate_brief(payload: dict) -> dict:
    case_id = payload["cases"][0]["case_id"]
    json_name = f"{case_id.lower()}-brief.json"
    html_name = f"{case_id.lower()}-brief.html"
    json_path = REPORTS_DIR / json_name
    html_path = REPORTS_DIR / html_name

    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    case = payload["cases"][0]
    risk_rows = "".join(
        f"""
        <tr>
          <td>{score['account_id']}</td>
          <td>{score['risk_score']}</td>
          <td>{score['chain_confidence']}</td>
          <td>{score['human_coordination_score']}</td>
          <td>{score['dissipation_risk']}</td>
          <td>{", ".join(score['indicators'])}</td>
        </tr>
        """
        for score in payload["sentinel_scores"][:8]
    )
    timeline_rows = "".join(
        f"<li><strong>{event['time']}</strong> - {event['title']} ({event['amount']})</li>"
        for event in payload["timeline"]
    )
    freeze_rows = "".join(
        f"<li>{action['account_id']} at {action['bank']} - INR {action['amount_frozen']:,} ({action['status']})</li>"
        for action in payload["intercept"]["frozen_accounts"]
    )

    # Color-code risk rows
    def risk_color(score):
        try:
            s = float(score)
            if s > 70: return "#FF4500"
            if s > 40: return "#f59e0b"
            return "#5ee9d5"
        except Exception:
            return "#e2e8f0"

    risk_rows_styled = ""
    for score in payload["sentinel_scores"][:8]:
        rc = risk_color(score.get("risk_score", 0))
        indicators = ", ".join(score.get("indicators", [])) or "—"
        risk_rows_styled += f"""
        <tr>
          <td style="font-weight:600;color:#e2e8f0">{score['account_id']}</td>
          <td style="color:{rc};font-weight:700">{score['risk_score']}</td>
          <td>{score['chain_confidence']}</td>
          <td>{score['human_coordination_score']}</td>
          <td>{score['dissipation_risk']}</td>
          <td style="color:rgba(226,232,240,0.6);font-size:0.85em">{indicators}</td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{case_id} — VARUNA Action Brief</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', 'Space Grotesk', -apple-system, sans-serif;
      background: #050814;
      color: #c8d6e5;
      padding: 40px 32px;
      line-height: 1.6;
      min-height: 100vh;
    }}
    .container {{ max-width: 960px; margin: 0 auto; }}
    .header {{
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 40px; padding-bottom: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }}
    .header h1 {{
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.8rem; font-weight: 700; color: #ffffff;
      letter-spacing: -0.03em;
    }}
    .header h1 span {{ color: #FF4500; }}
    .badge {{
      display: inline-flex; align-items: center; gap: 8px;
      border: 1px solid rgba(255,69,0,0.3); background: rgba(255,69,0,0.1);
      color: #FF4500; padding: 6px 16px; border-radius: 999px;
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.18em;
    }}
    .badge::before {{
      content: ''; width: 8px; height: 8px; border-radius: 50%;
      background: #FF4500; box-shadow: 0 0 8px #FF4500;
    }}
    .card {{
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px; padding: 28px; margin-bottom: 24px;
      backdrop-filter: blur(12px);
    }}
    .card h2 {{
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.35rem; font-weight: 700; color: #ffffff;
      margin-bottom: 16px; letter-spacing: -0.02em;
    }}
    .card h3 {{
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.1rem; font-weight: 600; color: #ffffff;
      margin-bottom: 16px; letter-spacing: -0.01em;
    }}
    .card p {{ margin-bottom: 8px; font-size: 0.95rem; }}
    .accent {{ color: #FF4500; font-weight: 600; }}
    .warn {{ color: #f59e0b; }}
    .meta-grid {{
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px; margin-top: 16px;
    }}
    .meta-item {{
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px; padding: 16px;
    }}
    .meta-item .label {{
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.2em;
      color: rgba(255,255,255,0.35); margin-bottom: 6px;
    }}
    .meta-item .value {{
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.15rem; font-weight: 600; color: #ffffff;
    }}
    ul {{ list-style: none; padding: 0; }}
    ul li {{
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 16px; margin-bottom: 8px;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
      border-radius: 14px; font-size: 0.9rem;
    }}
    ul li strong {{ color: #FF4500; font-weight: 600; white-space: nowrap; }}
    table {{ width: 100%; border-collapse: collapse; }}
    thead th {{
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.2em;
      color: rgba(255,255,255,0.35); padding: 12px 16px;
      border-bottom: 2px solid rgba(255,69,0,0.3); text-align: left;
      font-weight: 600;
    }}
    tbody td {{
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 0.88rem; vertical-align: top;
    }}
    tbody tr:hover {{ background: rgba(255,69,0,0.04); }}
    .footer {{
      margin-top: 40px; padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.07);
      text-align: center; font-size: 0.72rem;
      color: rgba(255,255,255,0.2); letter-spacing: 0.1em;
      text-transform: uppercase;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VARUNA <span>Action Brief</span></h1>
      <div class="badge">Enforcement Report</div>
    </div>

    <div class="card">
      <h2>{case['title']}</h2>
      <div class="meta-grid">
        <div class="meta-item">
          <div class="label">Threat Level</div>
          <div class="value" style="color:#FF4500">{case['threat_level']}</div>
        </div>
        <div class="meta-item">
          <div class="label">Flagged Source</div>
          <div class="value">{case['flagged_source_account']}</div>
        </div>
        <div class="meta-item">
          <div class="label">Recoverable Amount</div>
          <div class="value" style="color:#5ee9d5">INR {case['recoverable_amount']:,}</div>
        </div>
      </div>
      <p style="margin-top:16px;color:rgba(255,255,255,0.5);font-size:0.9rem">
        <span class="accent">Why flagged:</span> Velocity burst, fan-out layering, 3-hop cross-bank spread, and predicted downstream dissipation.
      </p>
    </div>

    <div class="card">
      <h3>Timeline</h3>
      <ul>{timeline_rows}</ul>
    </div>

    <div class="card">
      <h3>Freeze Actions</h3>
      <ul>{freeze_rows}</ul>
    </div>

    <div class="card">
      <h3>Risk Table</h3>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Risk</th>
            <th>Chain Conf.</th>
            <th>Coordination</th>
            <th>Dissipation</th>
            <th>Indicators</th>
          </tr>
        </thead>
        <tbody>{risk_rows_styled}</tbody>
      </table>
    </div>

    <div class="footer">
      VARUNA — Anti-Money Laundering Intelligence Platform · Confidential
    </div>
  </div>
</body>
</html>"""
    html_path.write_text(html, encoding="utf-8")

    return {
        "html_report_path": f"/reports/{html_name}",
        "json_report_path": f"/reports/{json_name}",
    }
