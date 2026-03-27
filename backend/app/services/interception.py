from __future__ import annotations

from app.models.schemas import FreezeAction, GraphNode, Transaction


def build_intercept_plan(transactions: list[Transaction], nodes: list[GraphNode]) -> dict:
    candidate_accounts = {"MULE-BLR-07", "MULE-GGN-14", "MULE-PUNE-11"}
    frozen = []
    total_recoverable = 0.0

    for node in nodes:
        if node.id in candidate_accounts:
            frozen_amount = max(node.balance, 0)
            total_recoverable += frozen_amount
            frozen.append(
                FreezeAction(
                    account_id=node.id,
                    bank=node.bank,
                    amount_frozen=round(frozen_amount, 2),
                    eta_seconds=42 if node.id == "MULE-BLR-07" else 67 if node.id == "MULE-GGN-14" else 95,
                    status="executed" if node.id != "MULE-PUNE-11" else "recommended",
                )
            )

    total_flow = sum(tx.amount for tx in transactions)
    dissipated_amount = sum(tx.amount for tx in transactions if tx.status == "dissipated")
    delay_loss = {
        "30_seconds": 18000,
        "90_seconds": 41000,
        "180_seconds": 68000,
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

