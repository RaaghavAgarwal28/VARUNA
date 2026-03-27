from __future__ import annotations

from app.models.schemas import CaseSummary, DashboardResponse
from app.services.analysis import extract_chain
from app.services.briefing import generate_brief
from app.services.detection import compute_scores
from app.services.interception import build_intercept_plan
from app.services.ml_models import get_model_metrics
from app.services.state import demo_state


def build_dashboard_response() -> DashboardResponse:
    transactions = demo_state.transactions
    nodes = demo_state.nodes
    links = demo_state.links
    account_profiles = demo_state.account_profiles
    sentinel_scores = compute_scores(transactions, nodes, account_profiles)
    intercept = build_intercept_plan(transactions, nodes)
    chain = extract_chain("MULE-HYD-01", transactions, hops=3)

    affected_banks = {tx.bank_from for tx in transactions} | {tx.bank_to for tx in transactions}
    total_suspicious = sum(tx.amount for tx in transactions if tx.is_suspicious)
    dissipated_amount = sum(tx.amount for tx in transactions if tx.status == "dissipated")
    event_feed = [
        {
            "id": "EVT-01",
            "time": "10:00:05",
            "title": "Victim push-to-mule transfer detected",
            "amount": "INR 1.25L",
            "severity": "critical",
        },
        {
            "id": "EVT-02",
            "time": "10:00:48",
            "title": "Layering split across HDFC and ICICI rails",
            "amount": "2 parallel branches",
            "severity": "high",
        },
        {
            "id": "EVT-03",
            "time": "10:01:42",
            "title": "Wallet/crypto off-ramp contact established",
            "amount": "INR 22K dissipated",
            "severity": "critical",
        },
        {
            "id": "EVT-04",
            "time": "10:02:10",
            "title": "Predictive tracker marks likely NCR spread",
            "amount": "2 likely next hops",
            "severity": "medium",
        },
        {
            "id": "EVT-05",
            "time": "10:02:35",
            "title": "Cross-bank freeze orchestration issued",
            "amount": "3 accounts targeted",
            "severity": "success",
        },
    ]
    timeline = [
        {"time": "10:00:05", "title": "Fraud entry", "amount": "INR 1,25,000"},
        {"time": "10:00:31", "title": "Hop 1 expansion", "amount": "INR 90,000"},
        {"time": "10:00:48", "title": "Layering split", "amount": "INR 28,000"},
        {"time": "10:01:18", "title": "3-hop burst coordination", "amount": "INR 31,000"},
        {"time": "10:02:35", "title": "Freeze execution", "amount": "INR 96,000 recoverable"},
    ]

    top_case = CaseSummary(
        case_id="CASE-VARUNA-042",
        title="UPI Mule Chain Interception - Multi-bank Dissipation Attempt",
        threat_level="Severe",
        suspicious_chains=4,
        recoverable_amount=intercept["projected_recoverable_amount"],
        dissipated_amount=dissipated_amount,
        banks_affected=len(affected_banks),
        average_intercept_time_seconds=81,
        predicted_next_hops=["PRED-NCR-88", "PRED-WALLET-04"],
        flagged_source_account="VICTIM-A1",
        chain_confidence=94.6,
        human_coordination_score=88.2,
        dissipation_risk=92.4,
    )

    payload = {
        "national_overview": {
            "active_suspicious_chains": 4,
            "recoverable_amount": intercept["projected_recoverable_amount"],
            "funds_already_dissipated": dissipated_amount,
            "banks_affected": len(affected_banks),
            "average_intercept_time_seconds": 81,
            "threat_index": 92,
            "urgency": "National coordination recommended within 90 seconds",
            "coverage_map": [
                {"region": "South", "cases": 2},
                {"region": "North", "cases": 1},
                {"region": "East", "cases": 1},
            ],
        },
        "event_feed": event_feed,
        "cases": [top_case.model_dump()],
        "graph": {
            "nodes": [node.model_dump() for node in nodes],
            "links": [link.model_dump() for link in links],
            "stats": {
                "total_accounts": len(nodes),
                "cross_bank_edges": len([tx for tx in transactions if tx.bank_from != tx.bank_to]),
                "total_suspicious_flow": total_suspicious,
            },
        },
        "timeline": timeline,
        "sentinel_scores": [score.model_dump() for score in sentinel_scores],
        "intercept": {
            **intercept,
            "frozen_accounts": [action.model_dump() for action in intercept["frozen_accounts"]],
        },
        "chain_transactions": chain["transactions"],
        "model_metrics": get_model_metrics(),
    }
    payload["brief"] = generate_brief(payload)
    return DashboardResponse(**payload)
