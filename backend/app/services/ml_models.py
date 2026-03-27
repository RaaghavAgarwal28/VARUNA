from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime

from app.models.schemas import Transaction


def parse_time(timestamp: str) -> datetime:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


def gat_placeholder_score(account_id: str, transactions: list[Transaction]) -> dict:
    outgoing_neighbors = {tx.to_account for tx in transactions if tx.from_account == account_id}
    incoming_neighbors = {tx.from_account for tx in transactions if tx.to_account == account_id}
    cross_bank_edges = [
        tx for tx in transactions if account_id in {tx.from_account, tx.to_account} and tx.bank_from != tx.bank_to
    ]
    score = min(48 + (len(outgoing_neighbors) * 12) + (len(incoming_neighbors) * 6) + (len(cross_bank_edges) * 5), 98)
    return {
        "model": "GAT-placeholder",
        "fraud_probability": round(score / 100, 3),
        "attention_explanation": [
            "account embedded in dense transfer neighborhood",
            "cross-bank edges carry higher attention weight",
            "fan-out branches amplify suspicious topology score",
        ],
    }


def lstm_temporal_placeholder(account_id: str, transactions: list[Transaction]) -> dict:
    txs = sorted(
        [tx for tx in transactions if tx.from_account == account_id or tx.to_account == account_id],
        key=lambda tx: parse_time(tx.timestamp),
    )
    if len(txs) < 2:
        return {
            "model": "LSTM-placeholder",
            "coordination_score": 0.42,
            "sequence_summary": "insufficient temporal sequence, fallback baseline applied",
        }

    deltas = []
    for previous, current in zip(txs, txs[1:]):
        deltas.append((parse_time(current.timestamp) - parse_time(previous.timestamp)).total_seconds())
    avg_delta = sum(deltas) / len(deltas)
    burstiness = max(0, 1 - min(avg_delta / 180, 1))
    coordination_score = min(0.45 + burstiness * 0.45 + (0.08 if len(txs) >= 4 else 0), 0.97)
    return {
        "model": "LSTM-placeholder",
        "coordination_score": round(coordination_score, 3),
        "sequence_summary": f"average inter-transfer gap {round(avg_delta, 1)} seconds across {len(txs)} events",
    }


def continual_learning_stub() -> dict:
    return {
        "strategy": "EWC + replay buffer (planned)",
        "status": "explain-only for demo",
        "note": "Penalty on important weights and replay of historical fraud motifs can support post-launch adaptation without catastrophic forgetting.",
    }

