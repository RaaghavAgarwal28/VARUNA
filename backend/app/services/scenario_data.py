"""
VARUNA — Dynamic Fraud Scenario Generator (v2)
================================================
Generates a randomized mule-chain fraud scenario with a **different
topology** on every call.  The number of hops, branching factor, sink
placement, and predicted next-hop count all vary, producing visually
and structurally unique chains each time.
"""
from __future__ import annotations

import json
from pathlib import Path
from app.models.schemas import GraphLink, GraphNode, Transaction

def build_scenario() -> dict:
    """Load the pre-generated static 500-node scenario."""
    
    data_path = Path(__file__).parent.parent.parent / "ml" / "data" / "static_500_scenario.json"
    with open(data_path, "r") as f:
        data = json.load(f)

    return {
        "transactions": [Transaction(**t) for t in data["transactions"]],
        "nodes": [GraphNode(**n) for n in data["nodes"]],
        "links": [GraphLink(**l) for l in data["links"]],
        "account_profiles": data["account_profiles"],
        "frozen_accounts": set(data["frozen_accounts"]),
        "predicted_next_hops": data["predicted_next_hops"],
        "victim_id": data["victim_id"],
        "primary_mule": data["primary_mule"],
        "sink_id": data["sink_id"]
    }
