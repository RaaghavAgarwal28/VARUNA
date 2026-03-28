from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Transaction(BaseModel):
    tx_id: str
    timestamp: str
    from_account: str
    to_account: str
    amount: float
    bank_from: str
    bank_to: str
    channel: str
    status: Literal["processing", "flagged", "frozen", "dissipated"]
    is_suspicious: bool = False
    tx_hash: str | None = None


class GraphNode(BaseModel):
    id: str
    label: str
    bank: str
    node_type: Literal["victim", "mule", "suspect", "predicted", "sink"]
    balance: float
    risk_score: float
    human_coordination_score: float
    dissipation_risk: float
    status: Literal["active", "watch", "frozen", "predicted"]


class GraphLink(BaseModel):
    source: str
    target: str
    amount: float
    timestamp: str
    hop: int
    status: Literal["observed", "predicted", "frozen"]


class RiskScore(BaseModel):
    account_id: str
    risk_score: float
    chain_confidence: float
    human_coordination_score: float
    dissipation_risk: float
    indicators: list[str]
    gat_score: float = 0.0
    lstm_score: float = 0.0
    flag_hits: list[str] = []


class FreezeAction(BaseModel):
    account_id: str
    bank: str
    amount_frozen: float
    eta_seconds: int
    status: Literal["recommended", "executed", "simulated_loss"]


class CaseSummary(BaseModel):
    case_id: str
    title: str
    threat_level: Literal["Severe", "High", "Elevated"]
    suspicious_chains: int
    recoverable_amount: float
    dissipated_amount: float
    banks_affected: int
    average_intercept_time_seconds: int
    predicted_next_hops: list[str]
    flagged_source_account: str
    chain_confidence: float
    human_coordination_score: float
    dissipation_risk: float


class BriefArtifact(BaseModel):
    html_report_path: str
    json_report_path: str


class DashboardResponse(BaseModel):
    national_overview: dict
    event_feed: list[dict]
    cases: list[CaseSummary]
    graph: dict
    timeline: list[dict]
    sentinel_scores: list[RiskScore]
    intercept: dict
    chain_transactions: list[dict] = []
    brief: BriefArtifact
    model_metrics: dict = {}
    architecture_note: str = Field(
        default="Scoring powered by VarunaGAT (EWC fine-tuned) + VarunaLSTM + 10-flag RBI rule engine."
    )



class TransactionIngestRequest(BaseModel):
    tx_id: str
    timestamp: str
    from_account: str
    to_account: str
    amount: float
    bank_from: str
    bank_to: str
    channel: str = "UPI"
    status: Literal["processing", "flagged", "frozen", "dissipated"] = "processing"
    is_suspicious: bool = False
    tx_hash: str | None = None


class FreezeRequest(BaseModel):
    account_id: str

