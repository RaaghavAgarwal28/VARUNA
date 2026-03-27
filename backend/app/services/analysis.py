from __future__ import annotations

from collections import defaultdict, deque

from app.models.schemas import Transaction
from app.services.detection import compute_scores
from app.services.interception import build_intercept_plan
from app.services.ml_models import continual_learning_stub, gat_placeholder_score, lstm_temporal_placeholder


def extract_chain(seed_account: str, transactions: list[Transaction], hops: int = 3) -> dict:
    adjacency = defaultdict(list)
    tx_by_pair = defaultdict(list)
    for tx in transactions:
        adjacency[tx.from_account].append(tx.to_account)
        tx_by_pair[(tx.from_account, tx.to_account)].append(tx)

    visited = {seed_account}
    queue = deque([(seed_account, 0)])
    nodes = {seed_account}
    chain_transactions = []

    while queue:
        current, depth = queue.popleft()
        if depth >= hops:
            continue
        for neighbor in adjacency.get(current, []):
            nodes.add(neighbor)
            chain_transactions.extend(tx_by_pair[(current, neighbor)])
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, depth + 1))

    chain_transactions.sort(key=lambda tx: tx.timestamp)
    return {
        "seed_account": seed_account,
        "hop_limit": hops,
        "accounts": sorted(nodes),
        "transactions": [tx.model_dump() for tx in chain_transactions],
        "chain_path": " -> ".join(sorted(nodes)),
    }


def analyze_account(account_id: str, transactions, nodes, account_profiles) -> dict:
    sentinel_scores = compute_scores(transactions, nodes, account_profiles)
    score_by_id = {item.account_id: item for item in sentinel_scores}
    chain = extract_chain(account_id, transactions, hops=3)
    gat_result = gat_placeholder_score(account_id, transactions)
    lstm_result = lstm_temporal_placeholder(account_id, transactions)
    intercept = build_intercept_plan(transactions, nodes)
    score = score_by_id.get(account_id)

    return {
        "account_id": account_id,
        "velocity_rule_hits": score.indicators if score else [],
        "risk": score.model_dump() if score else None,
        "graph_model": gat_result,
        "temporal_model": lstm_result,
        "combined_score": round(
            (
                ((score.risk_score / 100) if score else 0.4) * 0.45
                + gat_result["fraud_probability"] * 0.35
                + lstm_result["coordination_score"] * 0.2
            ),
            3,
        ),
        "chain": chain,
        "intercept_preview": intercept,
        "continual_learning": continual_learning_stub(),
    }

