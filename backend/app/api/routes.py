from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FreezeRequest, TransactionIngestRequest
from app.services.analysis import analyze_account, extract_chain
from app.services.dashboard import build_dashboard_response
from app.services.state import demo_state


router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


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
