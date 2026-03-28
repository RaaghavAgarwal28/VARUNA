"""
VARUNA — API Routes (Security-Enhanced)
=========================================
All endpoints are protected by the security layer:
    - Public: /health, /auth/*
    - Viewer+: /dashboard, /graph-analysis, /rings
    - Analyst+: /analyze, /chain, /flags, /model-metrics, /continual-learning
    - Admin: /freeze, /inject-fraud, /reset
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import (
    TokenPayload,
    UserRole,
    get_current_user,
    require_role,
    log_security_event,
)
from app.models.schemas import FreezeRequest, TransactionIngestRequest
from app.services.analysis import analyze_account, extract_chain
from app.services.dashboard import build_dashboard_response
from app.services.detection import run_all_flags, FLAG_INFO
from app.services.ml_models import get_model_metrics, continual_learning_stub, eif_anomaly_score
from app.services.graph_analysis import analyze_graph, get_node_role, get_rings
from app.services.state import demo_state


router = APIRouter()


# ── Public ──

@router.get("/health")
def health() -> dict:
    return {"status": "ok", "ml_ready": True, "security": "active", "version": "2.0.0"}


# ── Viewer+ (any authenticated user) ──

@router.get("/dashboard")
def dashboard(user: TokenPayload = Depends(get_current_user)):
    return build_dashboard_response()


@router.get("/graph-analysis")
def graph_analysis(user: TokenPayload = Depends(get_current_user)):
    """Run DFS ring detection and return structural analysis with roles."""
    result = analyze_graph(demo_state.transactions)
    return result


@router.get("/rings")
def rings(user: TokenPayload = Depends(get_current_user)):
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


# ── Analyst+ ──

@router.post("/transaction")
def ingest_transaction(
    payload: TransactionIngestRequest,
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
    log_security_event("TX_INGEST", user.sub, "api", f"tx_id={payload.tx_id}")
    return demo_state.ingest_transaction(payload)


@router.get("/analyze/{account_id}")
def analyze(
    account_id: str,
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
    return analyze_account(
        account_id,
        demo_state.transactions,
        demo_state.nodes,
        demo_state.account_profiles,
    )


@router.get("/chain/{account_id}")
def chain(
    account_id: str,
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
    return extract_chain(account_id, demo_state.transactions, hops=3)


@router.get("/flags/{account_id}")
def get_flags(
    account_id: str,
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
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


@router.get("/model-metrics")
def model_metrics(
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
    """Return training metrics for all ML models."""
    return get_model_metrics()


@router.get("/continual-learning")
def continual_learning(
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
    """Return continual learning strategy and metrics."""
    return continual_learning_stub()


@router.get("/node-role/{account_id}")
def node_role(
    account_id: str,
    user: TokenPayload = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN)),
):
    """Return the structural role of a specific account in the graph."""
    role = get_node_role(account_id)
    eif = eif_anomaly_score(account_id, demo_state.transactions)
    return {
        "account_id": account_id,
        "role": role,
        "eif": eif,
    }


# ── Admin Only ──

@router.post("/inject-fraud")
def inject_fraud(
    user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
):
    log_security_event("FRAUD_INJECT", user.sub, "api", "Demo fraud scenario injected", "WARNING")
    return demo_state.inject_scenario()


@router.post("/reset")
def reset_demo(
    user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
):
    log_security_event("DEMO_RESET", user.sub, "api", "Demo state reset")
    demo_state.reset()
    return {"status": "reset"}


@router.post("/freeze/{account_id}")
def freeze(
    account_id: str,
    user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
):
    log_security_event(
        "ACCOUNT_FREEZE",
        user.sub,
        "api",
        f"Freeze executed on {account_id}",
        "WARNING",
    )
    return demo_state.freeze_account(account_id)
