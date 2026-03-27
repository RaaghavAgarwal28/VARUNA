from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FreezeRequest, TransactionIngestRequest
from app.services.analysis import analyze_account, extract_chain
from app.services.dashboard import build_dashboard_response
from app.services.detection import run_all_flags, FLAG_INFO
from app.services.ml_models import get_model_metrics, continual_learning_stub, eif_anomaly_score
from app.services.graph_analysis import analyze_graph, get_node_role, get_rings
from app.services.blockchain import varuna_ledger
from app.services.state import demo_state


router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "ml_ready": True}


@router.get("/dashboard")
def dashboard():
    return build_dashboard_response()


@router.post("/transaction")
def ingest_transaction(payload: TransactionIngestRequest):
    return demo_state.ingest_transaction(payload)


@router.post("/inject-fraud")
def inject_fraud():
    return demo_state.inject_scenario()


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


# ── Enterprise Upgrade Endpoints (from MULE_HUNTER learnings) ──

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


@router.get("/audit-ledger")
def audit_ledger():
    """Return the cryptographic audit ledger summary."""
    return varuna_ledger.get_ledger_summary()


@router.get("/audit-ledger/verify")
def verify_ledger():
    """Verify the integrity of the entire audit chain."""
    return varuna_ledger.verify_integrity()


@router.get("/audit-ledger/entry/{entry_id}")
def audit_entry(entry_id: str):
    """Get a Merkle proof for a specific audit entry."""
    proof = varuna_ledger.get_entry_proof(entry_id)
    if proof is None:
        return {"error": f"Entry {entry_id} not found"}
    return proof
