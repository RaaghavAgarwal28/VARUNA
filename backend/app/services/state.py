from __future__ import annotations

from copy import deepcopy

from app.models.schemas import Transaction, GraphNode, GraphLink, TransactionIngestRequest
from app.services.scenario_data import build_scenario


class DemoState:
    transactions: list
    nodes: list
    links: list
    account_profiles: dict
    _predicted_next_hops: list
    _frozen_accounts: set
    _victim_id: str
    _primary_mule: str
    _sink_id: str

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        scenario = build_scenario()
        self._load(scenario)

    def _load(self, scenario: dict) -> None:
        """Internal loader — hydrates state from a scenario dict."""
        self.transactions = deepcopy(scenario["transactions"])
        self.nodes = deepcopy(scenario["nodes"])
        self.links = deepcopy(scenario["links"])
        self.account_profiles = deepcopy(scenario["account_profiles"])
        self._predicted_next_hops = list(scenario.get("predicted_next_hops", []))
        self._frozen_accounts = set(scenario.get("frozen_accounts", set()))
        self._victim_id = scenario.get("victim_id", "")
        self._primary_mule = scenario.get("primary_mule", "")
        self._sink_id = scenario.get("sink_id", "")

    def load_from_data(self, data: dict) -> None:
        """Load a generated scenario dict (raw dicts, not Pydantic) into state."""
        from app.models.schemas import Transaction, GraphNode, GraphLink

        self.transactions = [Transaction(**t) for t in data["transactions"]]
        self.nodes = [GraphNode(**n) for n in data["nodes"]]
        self.links = [GraphLink(**l) for l in data["links"]]
        self.account_profiles = deepcopy(data["account_profiles"])
        self._predicted_next_hops = list(data.get("predicted_next_hops", []))
        self._frozen_accounts = set(data.get("frozen_accounts", set()))
        self._victim_id = data.get("victim_id", "")
        self._primary_mule = data.get("primary_mule", "")
        self._sink_id = data.get("sink_id", "")

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
