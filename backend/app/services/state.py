from __future__ import annotations

from copy import deepcopy

from app.models.schemas import Transaction, TransactionIngestRequest
from app.services.scenario_data import build_scenario


class DemoState:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        scenario = build_scenario()
        self.transactions = deepcopy(scenario["transactions"])
        self.nodes = deepcopy(scenario["nodes"])
        self.links = deepcopy(scenario["links"])
        self.account_profiles = deepcopy(scenario["account_profiles"])

    def inject_scenario(self) -> dict:
        self.reset()
        return {"status": "injected", "transaction_count": len(self.transactions)}

    def ingest_transaction(self, payload: TransactionIngestRequest) -> dict:
        transaction = Transaction(**payload.model_dump())
        self.transactions.append(transaction)
        return {"status": "accepted", "tx_id": transaction.tx_id}

    def freeze_account(self, account_id: str) -> dict:
        matched = False
        for node in self.nodes:
            if node.id == account_id:
                node.status = "frozen"
                matched = True
        for tx in self.transactions:
            if tx.to_account == account_id or tx.from_account == account_id:
                if tx.status == "processing":
                    tx.status = "frozen"
        for link in self.links:
            if link.source == account_id or link.target == account_id:
                if link.status != "predicted":
                    link.status = "frozen"
        return {"status": "executed" if matched else "not_found", "account_id": account_id}


demo_state = DemoState()

