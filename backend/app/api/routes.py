"""
VARUNA — API Routes
=====================
Unified routes with generate-fraud endpoint for simultaneous
Sentinel + Mule Hunter 3D + scenario file generation.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FreezeRequest, TransactionIngestRequest, SimulateTransactionRequest
from app.services.analysis import analyze_account, extract_chain
from app.services.dashboard import build_dashboard_response
from app.services.detection import run_all_flags, FLAG_INFO, simulate_comprehensive_scores
from app.services.ml_models import get_model_metrics, continual_learning_stub, eif_anomaly_score
from app.services.graph_analysis import analyze_graph, get_node_role, get_rings
from app.services.state import demo_state
from app.core.config import REPORTS_DIR


router = APIRouter()


# ── Public ──

@router.get("/health")
def health() -> dict:
    return {"status": "ok", "ml_ready": True, "security": "active", "version": "2.0.0"}


# ── Core Endpoints ──

@router.get("/dashboard")
def dashboard():
    return build_dashboard_response()


@router.post("/transaction")
def ingest_transaction(payload: TransactionIngestRequest):
    return demo_state.ingest_transaction(payload)


@router.post("/inject-fraud")
def inject_fraud():
    return demo_state.inject_scenario()


@router.post("/generate-fraud")
def generate_fraud():
    """Generate a fresh randomized fraud scenario.
    
    This is the key endpoint that drives simultaneous linkage:
    1. Generates a new 500-node scenario with randomized mule chains
    2. Saves it to reports/generated/scenario_{timestamp}.json
    3. Loads it into demo_state (so /dashboard reflects the new data)
    4. Returns metadata including the longest mule chain
    
    After this call, GET /dashboard will return the updated scenario,
    which simultaneously updates Sentinel Panel and Mule Hunter 3D.
    """
    from app.services.generation import generate_and_save

    result = generate_and_save(REPORTS_DIR)
    demo_state.load_from_data(result["data"])
    return {
        "status": "generated",
        "metadata": result["metadata"],
    }


@router.post("/simulate-transaction")
def simulate_transaction(payload: SimulateTransactionRequest):
    return simulate_comprehensive_scores(payload)


@router.post("/reset")
def reset_demo():
    demo_state.reset()
    return {"status": "reset"}


@router.get("/analyze/{account_id}")
def analyze(account_id: str):
    return analyze_account(
        account_id,
        demo_state.transactions,
        demo_state.nodes,
        demo_state.account_profiles,
    )


@router.get("/chain/{account_id}")
def chain(account_id: str):
    return extract_chain(account_id, demo_state.transactions, hops=3)


@router.post("/freeze/{account_id}")
def freeze(account_id: str):
    return demo_state.freeze_account(account_id)


# ── ML Endpoints ──

@router.get("/model-metrics")
def model_metrics():
    """Return training metrics for all ML models (GAT, LSTM, EIF, EWC, transfer validation)."""
    return get_model_metrics()


@router.get("/flags/{account_id}")
def get_flags(account_id: str):
    """Return detailed F1-F10 flag analysis for a specific account."""
    flag_hits = run_all_flags(account_id, demo_state.transactions, demo_state.account_profiles)
    return {
        "account_id": account_id,
        "flag_hits": flag_hits,
        "all_flags": FLAG_INFO,
        "total_hits": len(flag_hits),
        "critical_hits": sum(1 for f in flag_hits if f.get("severity") == "critical"),
        "high_hits": sum(1 for f in flag_hits if f.get("severity") == "high"),
    }


@router.get("/continual-learning")
def continual_learning():
    """Return continual learning strategy and metrics."""
    return continual_learning_stub()


# ── Graph Analysis Endpoints ──

@router.get("/graph-analysis")
def graph_analysis():
    """Run DFS ring detection and return structural analysis with roles."""
    result = analyze_graph(demo_state.transactions)
    return result


@router.get("/rings")
def rings():
    """Return pre-cached ring structures."""
    ring_list = get_rings()
    return {
        "rings": ring_list,
        "total": len(ring_list),
        "types": {
            "cycles": sum(1 for r in ring_list if r.get("type") == "CYCLE"),
            "stars": sum(1 for r in ring_list if r.get("type") == "STAR"),
            "chains": sum(1 for r in ring_list if r.get("type") == "CHAIN"),
        },
    }


@router.get("/node-role/{account_id}")
def node_role(account_id: str):
    """Return the structural role of a specific account in the graph."""
    role = get_node_role(account_id)
    eif = eif_anomaly_score(account_id, demo_state.transactions)
    return {
        "account_id": account_id,
        "role": role,
        "eif": eif,
    }


@router.get("/deep-explain/{account_id}")
def deep_explain(account_id: str):
    """Full transparent breakdown for the Live Simulation panel.

    Returns every component of the 4-pillar scoring so the frontend
    can display the exact math step-by-step in layman language.
    """
    from app.services.ml_models import gat_score, lstm_temporal_score, eif_anomaly_score

    # 1. Find the account node info
    node_info = None
    for n in demo_state.nodes:
        if n.id == account_id:
            node_info = {
                "id": n.id, "label": n.label, "bank": n.bank,
                "node_type": n.node_type, "balance": n.balance,
                "risk_score": n.risk_score, "status": n.status,
            }
            break

    # 2. Transactions involving this account
    account_txs = []
    total_sent = 0
    total_received = 0
    banks_involved = set()
    counterparties = set()
    for tx in demo_state.transactions:
        if tx.from_account == account_id:
            account_txs.append({"direction": "SENT", "from": tx.from_account,
                                "to": tx.to_account, "amount": tx.amount,
                                "bank_from": tx.bank_from, "bank_to": tx.bank_to,
                                "channel": tx.channel, "timestamp": tx.timestamp,
                                "status": tx.status, "suspicious": tx.is_suspicious})
            total_sent += tx.amount
            banks_involved.add(tx.bank_from)
            banks_involved.add(tx.bank_to)
            counterparties.add(tx.to_account)
        elif tx.to_account == account_id:
            account_txs.append({"direction": "RECEIVED", "from": tx.from_account,
                                "to": tx.to_account, "amount": tx.amount,
                                "bank_from": tx.bank_from, "bank_to": tx.bank_to,
                                "channel": tx.channel, "timestamp": tx.timestamp,
                                "status": tx.status, "suspicious": tx.is_suspicious})
            total_received += tx.amount
            banks_involved.add(tx.bank_from)
            banks_involved.add(tx.bank_to)
            counterparties.add(tx.from_account)

    # 3. Run each ML model individually
    gat_result = gat_score(account_id, demo_state.transactions)
    lstm_result = lstm_temporal_score(account_id, demo_state.transactions)
    eif_result = eif_anomaly_score(account_id, demo_state.transactions)

    gat_prob = gat_result.get("fraud_probability", 0.5)
    lstm_coord = lstm_result.get("coordination_score", 0.42)
    eif_anom = eif_result.get("anomaly_score", 0.3)

    # 4. Run the 10-flag rule engine
    flag_hits = run_all_flags(account_id, demo_state.transactions, demo_state.account_profiles)
    n_critical = sum(1 for f in flag_hits if f.get("severity") == "critical")
    n_high = sum(1 for f in flag_hits if f.get("severity") == "high")
    n_medium = sum(1 for f in flag_hits if f.get("severity") == "medium")
    flag_score = min((n_critical * 30 + n_high * 15 + n_medium * 8) / 100, 1.0)

    # 5. Get graph structural role
    role_info = get_node_role(account_id)
    role = role_info.get("role", "UNKNOWN")
    role_multiplier = {"HUB": 1.25, "BRIDGE": 1.15, "MULE": 1.10, "LEAF": 1.0}.get(role, 1.0)

    # 6. 4-Pillar Calculation (EXACT same formula as detection.py)
    gat_weighted = gat_prob * 0.35
    lstm_weighted = lstm_coord * 0.25
    eif_weighted = eif_anom * 0.20
    rule_weighted = flag_score * 0.20
    raw_combined = gat_weighted + lstm_weighted + eif_weighted + rule_weighted
    final_score = min(raw_combined * role_multiplier, 1.0)

    # 7. Decision
    if final_score >= 0.75:
        decision = "BLOCK"
        decision_reason = "Score exceeds 75% threshold — automatic freeze recommended"
    elif final_score >= 0.45:
        decision = "REVIEW"
        decision_reason = "Score between 45-75% — manual analyst review required"
    else:
        decision = "APPROVE"
        decision_reason = "Score below 45% — no immediate action needed"

    return {
        "account_id": account_id,
        "node_info": node_info,
        "transaction_summary": {
            "total_transactions": len(account_txs),
            "total_sent": total_sent,
            "total_received": total_received,
            "net_flow": total_received - total_sent,
            "banks_involved": list(banks_involved),
            "unique_counterparties": len(counterparties),
            "transactions": account_txs[:20],  # cap at 20 for UI
        },
        "brain_1_gat": {
            "name": "VarunaGAT — The Shape Matcher",
            "model": gat_result.get("model", "GAT"),
            "score": round(gat_prob, 4),
            "score_pct": round(gat_prob * 100, 1),
            "weight": 0.35,
            "weighted_contribution": round(gat_weighted, 4),
            "explanation": gat_result.get("attention_explanation", []),
            "subgraph_size": gat_result.get("subgraph_size"),
            "subgraph_edges": gat_result.get("subgraph_edges"),
            "layman": (
                f"This AI looks at the SHAPE of money movement. It built a map of {gat_result.get('subgraph_size', '?')} "
                f"accounts and {gat_result.get('subgraph_edges', '?')} transfers. "
                f"It recognized this pattern as {round(gat_prob * 100, 1)}% similar to known fraud shapes "
                f"(Stars, Cycles, Chains)."
            ),
        },
        "brain_2_lstm": {
            "name": "VarunaLSTM — The Timing Expert",
            "model": lstm_result.get("model", "LSTM"),
            "score": round(lstm_coord, 4),
            "score_pct": round(lstm_coord * 100, 1),
            "weight": 0.25,
            "weighted_contribution": round(lstm_weighted, 4),
            "sequence_length": lstm_result.get("sequence_length", 0),
            "avg_delta_seconds": lstm_result.get("avg_delta_seconds", 0),
            "layman": (
                f"This AI watches the TIMING of transfers. It analyzed {lstm_result.get('sequence_length', '?')} "
                f"transactions with an average gap of {lstm_result.get('avg_delta_seconds', '?')} seconds between them. "
                f"{'Criminals rush money through accounts in rapid bursts. This pattern matches that behavior.' if lstm_coord > 0.6 else 'The timing did not strongly match known criminal rushing patterns.'} "
                f"Coordination score: {round(lstm_coord * 100, 1)}%."
            ),
        },
        "brain_3_eif": {
            "name": "VarunaEIF — The Outlier Detector",
            "model": eif_result.get("model", "EIF"),
            "score": round(eif_anom, 4),
            "score_pct": round(eif_anom * 100, 1),
            "weight": 0.20,
            "weighted_contribution": round(eif_weighted, 4),
            "features": eif_result.get("features", {}),
            "layman": (
                f"This AI compares this account's behavior to NORMAL customers. "
                f"It measures velocity ({round(eif_result.get('features', {}).get('velocity', 0) * 100, 1)}%), "
                f"cross-bank activity ({round(eif_result.get('features', {}).get('cross_bank_ratio', 0) * 100, 1)}%), "
                f"and timing regularity ({round(eif_result.get('features', {}).get('time_regularity', 0) * 100, 1)}%). "
                f"Anomaly score: {round(eif_anom * 100, 1)}% — "
                f"{'this account is behaving VERY differently from normal customers.' if eif_anom > 0.6 else 'behavior is within semi-normal range.'}"
            ),
        },
        "brain_4_rules": {
            "name": "10-Flag RBI Rule Engine — The Rule Book",
            "total_rules": 10,
            "rules_triggered": len(flag_hits),
            "critical_count": n_critical,
            "high_count": n_high,
            "medium_count": n_medium,
            "score": round(flag_score, 4),
            "score_pct": round(flag_score * 100, 1),
            "weight": 0.20,
            "weighted_contribution": round(rule_weighted, 4),
            "flag_hits": flag_hits,
            "all_flags": FLAG_INFO,
            "layman": (
                f"We checked 10 banking rules set by the RBI (Reserve Bank of India). "
                f"This account broke {len(flag_hits)} rules: "
                f"{n_critical} critical, {n_high} high-risk, {n_medium} medium. "
                f"Rule score: {round(flag_score * 100, 1)}%."
            ),
        },
        "graph_role": {
            "role": role,
            "role_multiplier": role_multiplier,
            "confidence": role_info.get("confidence", 0),
            "out_degree": role_info.get("out_degree", 0),
            "in_degree": role_info.get("in_degree", 0),
            "ring_memberships": role_info.get("ring_memberships", 0),
            "layman": (
                f"In the transaction network, this account acts as a '{role}'. "
                + ({
                    "HUB": "It's the central command point — directing money to many other accounts, like a spider in a web. Risk multiplied by 1.25x.",
                    "BRIDGE": "It connects different groups of suspicious accounts — a critical junction. Risk multiplied by 1.15x.",
                    "MULE": "It's a pass-through account — money comes in and goes right out. Risk multiplied by 1.10x.",
                    "LEAF": "It's at the edge of the network — either the starting or ending point. No multiplier applied.",
                }.get(role, "Unknown role."))
            ),
        },
        "final_calculation": {
            "formula": "Final = (GAT × 35%) + (LSTM × 25%) + (EIF × 20%) + (Rules × 20%) × Role Multiplier",
            "steps": [
                f"GAT Shape Score:   {round(gat_prob * 100, 1)}% × 35% = {round(gat_weighted * 100, 2)}%",
                f"LSTM Timing Score: {round(lstm_coord * 100, 1)}% × 25% = {round(lstm_weighted * 100, 2)}%",
                f"EIF Outlier Score: {round(eif_anom * 100, 1)}% × 20% = {round(eif_weighted * 100, 2)}%",
                f"Rule Breach Score: {round(flag_score * 100, 1)}% × 20% = {round(rule_weighted * 100, 2)}%",
                f"─────────────────────────────────────",
                f"Base Score:        {round(raw_combined * 100, 2)}%",
                f"Role Multiplier:   × {role_multiplier} (role: {role})",
                f"═══════════════════════════════════════",
                f"FINAL RISK SCORE:  {round(final_score * 100, 1)}%",
            ],
            "raw_combined": round(raw_combined, 4),
            "raw_combined_pct": round(raw_combined * 100, 2),
            "role_multiplier": role_multiplier,
            "final_score": round(final_score, 4),
            "final_score_pct": round(final_score * 100, 1),
            "decision": decision,
            "decision_reason": decision_reason,
        },
    }
