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

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>{case_id} Action Brief</title>
      <style>
        body {{ font-family: Arial, sans-serif; background: #08111f; color: #ecf6ff; padding: 32px; }}
        .card {{ background: #101d31; border: 1px solid #234166; border-radius: 18px; padding: 20px; margin-bottom: 20px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ border-bottom: 1px solid #234166; padding: 12px; text-align: left; vertical-align: top; }}
        .accent {{ color: #7de2d1; }}
        .warn {{ color: #ffb85c; }}
      </style>
    </head>
    <body>
      <h1>VARUNA Enforcement Action Brief</h1>
      <div class="card">
        <h2>{case['title']}</h2>
        <p><span class="accent">Threat Level:</span> {case['threat_level']}</p>
        <p><span class="accent">Flagged Source Account:</span> {case['flagged_source_account']}</p>
        <p><span class="accent">Estimated Recoverable Amount:</span> INR {case['recoverable_amount']:,}</p>
        <p><span class="accent">Why flagged:</span> Velocity burst, fan-out layering, 3-hop cross-bank spread, and predicted downstream dissipation.</p>
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
              <th>Chain Confidence</th>
              <th>Human Coordination</th>
              <th>Dissipation Risk</th>
              <th>Indicators</th>
            </tr>
          </thead>
          <tbody>{risk_rows}</tbody>
        </table>
      </div>
    </body>
    </html>
    """
    html_path.write_text(html, encoding="utf-8")

    return {
        "html_report_path": f"/reports/{html_name}",
        "json_report_path": f"/reports/{json_name}",
    }
