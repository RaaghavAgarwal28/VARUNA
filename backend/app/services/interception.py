"""
VARUNA — Dynamic Freeze Interception Planner
==============================================
Picks freeze candidates dynamically based on node balance and type
rather than hardcoded account IDs.
"""
from __future__ import annotations

import random

from app.models.schemas import FreezeAction, GraphNode, Transaction


def build_intercept_plan(transactions: list[Transaction], nodes: list[GraphNode]) -> dict:
    """Build freeze plan by targeting mule nodes with positive balances."""

    # Find all mule/suspect nodes with positive balances — these are freeze candidates
    candidates = [
        node for node in nodes
        if node.node_type in ("mule", "suspect")
        and node.balance > 0
    ]

    # Sort by balance descending — freeze highest-value targets first
    candidates.sort(key=lambda n: n.balance, reverse=True)

    # Pick up to 3 candidates for freeze action
    selected = candidates[:3]

    frozen = []
    total_recoverable = 0.0

    for i, node in enumerate(selected):
        frozen_amount = max(node.balance, 0)
        total_recoverable += frozen_amount
        # First accounts already frozen, last is recommended
        status = "executed" if i < len(selected) - 1 else "recommended"
        eta = random.randint(30, 120)
        frozen.append(
            FreezeAction(
                account_id=node.id,
                bank=node.bank,
                amount_frozen=round(frozen_amount, 2),
                eta_seconds=eta,
                status=status,
            )
        )

    total_flow = sum(tx.amount for tx in transactions) or 1
    dissipated_amount = sum(tx.amount for tx in transactions if tx.status == "dissipated")

    # Delay loss projections scaled to actual scenario size
    base_loss_rate = total_flow * 0.15  # ~15% lost per 30s escalation
    delay_loss = {
        "30_seconds": round(base_loss_rate),
        "90_seconds": round(base_loss_rate * 2.3),
        "180_seconds": round(base_loss_rate * 3.8),
    }

    return {
        "frozen_accounts": frozen,
        "projected_recoverable_amount": round(total_recoverable, 2),
        "funds_already_dissipated": round(dissipated_amount, 2),
        "freeze_coverage_ratio": round((total_recoverable / total_flow) * 100, 1),
        "simulate_3_minute_delay": {
            "additional_loss": delay_loss["180_seconds"],
            "recoverable_after_delay": max(round(total_recoverable - delay_loss["180_seconds"], 2), 0),
            "narrative": "A 3-minute response delay allows the chain to reach wallet and cash-out rails before bank acknowledgements complete.",
        },
    }
