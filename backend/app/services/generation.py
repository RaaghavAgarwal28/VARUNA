"""
VARUNA — Fraud Scenario Generation Service
=============================================
Wraps generate_full_500_scenario logic into a callable service.
Each invocation creates a fresh randomized 500-node scenario,
saves it to reports/generated/, and returns the data + metadata.
"""
from __future__ import annotations

import json
import random
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

INDIAN_BANKS = [
    "State Bank of India", "Axis Bank", "HDFC Bank", "ICICI Bank",
    "Kotak Mahindra Bank", "Yes Bank", "Punjab National Bank",
    "Bank of Baroda", "Canara Bank", "IndusInd Bank",
    "Union Bank of India", "Bank of India", "Federal Bank",
]
CITY_CODES = ["HYD", "BLR", "KOL", "PUNE", "GGN", "DEL", "MUM"]
CHANNELS = ["UPI", "IMPS", "NEFT"]


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_scenario(num_nodes: int = 500) -> dict:
    """Generate a full randomized fraud network scenario and return the data dict."""
    used_cities: set[str] = set()

    def _make_id(role: str) -> str:
        city = random.choice(CITY_CODES)
        used_cities.add(city)
        return f"{role}-{city}-{random.randint(100, 9999)}"

    # 1. Determine Roles
    num_victims = int(num_nodes * 0.05)
    num_mules = int(num_nodes * 0.20)
    num_sinks = int(num_nodes * 0.05)
    num_normal = num_nodes - num_victims - num_mules - num_sinks

    victim_ids = [_make_id("VICTIM") for _ in range(num_victims)]
    mule_ids = [_make_id("MULE") for _ in range(num_mules)]
    sink_ids = [f"FINTECH-SINK-{i}" for i in range(num_sinks)]
    predicted_ids = [_make_id("PRED") for _ in range(num_normal)]

    all_acc = victim_ids + mule_ids + sink_ids + predicted_ids

    # 2. Account Profiles & Nodes
    account_profiles: dict = {}
    nodes: list[dict] = []
    account_banks: dict[str, str] = {}
    balances: dict[str, float] = defaultdict(float)

    for aid in all_acc:
        if aid in victim_ids:
            bank = random.choice(INDIAN_BANKS)
            appr = {"created_days_ago": random.randint(300, 800), "device_id": f"DEV-{random.randint(1000,9999)}"}
        elif aid in mule_ids:
            bank = random.choice(INDIAN_BANKS)
            appr = {"created_days_ago": random.randint(2, 20), "device_id": f"DEV-CORE-{random.randint(10,99)}"}
        elif aid in sink_ids:
            bank = "Fintech Settlement"
            appr = {"created_days_ago": random.randint(100, 400), "device_id": f"DEV-SINK-{random.randint(10,99)}"}
        else:
            bank = random.choice(INDIAN_BANKS)
            appr = {"created_days_ago": random.randint(100, 500), "device_id": f"DEV-NORM-{random.randint(1000,9999)}"}

        account_profiles[aid] = appr
        account_banks[aid] = bank

    # 3. Build Transactions simulating money flow
    transactions: list[dict] = []
    tx_counter = 1000
    base_time = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=180)
    time_offset = 0

    def _next_ts() -> str:
        nonlocal time_offset
        time_offset += random.randint(5, 30)
        return _iso(base_time + timedelta(seconds=time_offset))

    # Victims -> Mules (Fan out)
    for v in victim_ids:
        targets = random.sample(mule_ids, random.randint(1, 3))
        amt = random.randint(50000, 200000)
        for t in targets:
            tx_amt = amt // len(targets)
            transactions.append({
                "tx_id": f"TX-{tx_counter}",
                "timestamp": _next_ts(),
                "from_account": v,
                "to_account": t,
                "amount": tx_amt,
                "bank_from": account_banks[v],
                "bank_to": account_banks[t],
                "channel": random.choice(CHANNELS),
                "status": "flagged",
                "is_suspicious": True,
                "tx_hash": f"SHA256-{uuid.uuid4().hex[:16].upper()}"
            })
            tx_counter += 1

    # Mules -> Mules (Layering)
    for m in mule_ids:
        if random.random() < 0.6:
            targets = random.sample(mule_ids, random.randint(1, 3))
            for t in targets:
                if t != m:
                    transactions.append({
                        "tx_id": f"TX-{tx_counter}",
                        "timestamp": _next_ts(),
                        "from_account": m,
                        "to_account": t,
                        "amount": random.randint(10000, 50000),
                        "bank_from": account_banks[m],
                        "bank_to": account_banks[t],
                        "channel": random.choice(CHANNELS),
                        "status": "flagged",
                        "is_suspicious": True,
                        "tx_hash": f"SHA256-{uuid.uuid4().hex[:16].upper()}"
                    })
                    tx_counter += 1

        # Mules -> Sinks (Dissipation)
        if random.random() < 0.4:
            target = random.choice(sink_ids)
            transactions.append({
                "tx_id": f"TX-{tx_counter}",
                "timestamp": _next_ts(),
                "from_account": m,
                "to_account": target,
                "amount": random.randint(20000, 100000),
                "bank_from": account_banks[m],
                "bank_to": account_banks[target],
                "channel": "Wallet Transfer",
                "status": "dissipated",
                "is_suspicious": True,
                "tx_hash": f"SHA256-{uuid.uuid4().hex[:16].upper()}"
            })
            tx_counter += 1

    # Background noise (Normal/Predicted)
    for p in predicted_ids:
        if random.random() < 0.05:
            target = random.choice(predicted_ids)
            if target != p:
                transactions.append({
                    "tx_id": f"TX-{tx_counter}",
                    "timestamp": _next_ts(),
                    "from_account": p,
                    "to_account": target,
                    "amount": random.randint(1000, 20000),
                    "bank_from": account_banks[p],
                    "bank_to": account_banks[target],
                    "channel": random.choice(CHANNELS),
                    "status": "processing",
                    "is_suspicious": False,
                    "tx_hash": f"SHA256-{uuid.uuid4().hex[:16].upper()}"
                })
                tx_counter += 1

    # 4. Compute Links and Balances
    for tx in transactions:
        balances[tx["from_account"]] -= tx["amount"]
        balances[tx["to_account"]] += tx["amount"]

    frozen_accounts = set(random.sample(mule_ids, min(5, len(mule_ids))))

    links: list[dict] = []
    for idx, tx in enumerate(transactions):
        links.append({
            "source": tx["from_account"],
            "target": tx["to_account"],
            "amount": tx["amount"],
            "timestamp": tx["timestamp"],
            "hop": min(idx // 100 + 1, 6),
            "status": "frozen" if tx["to_account"] in frozen_accounts else "observed"
        })

    # Extra predicted links
    for p in predicted_ids:
        if random.random() < 0.1:
            src = random.choice(mule_ids)
            links.append({
                "source": src,
                "target": p,
                "amount": random.randint(5000, 50000),
                "timestamp": _next_ts(),
                "hop": 6,
                "status": "predicted"
            })

    # Build final nodes
    for aid in all_acc:
        if aid in victim_ids:
            ntype = "victim"
        elif aid in mule_ids:
            ntype = "mule"
        elif aid in sink_ids:
            ntype = "sink"
        else:
            ntype = "predicted"

        nodes.append({
            "id": aid,
            "label": aid,
            "bank": account_banks[aid],
            "node_type": ntype,
            "balance": round(balances[aid], 2),
            "risk_score": random.randint(80, 99) if ntype != "predicted" else random.randint(5, 40),
            "human_coordination_score": random.randint(20, 99),
            "dissipation_risk": random.randint(20, 99),
            "status": "frozen" if aid in frozen_accounts else ("predicted" if ntype == "predicted" else "active")
        })

    return {
        "transactions": transactions,
        "nodes": nodes,
        "links": links,
        "account_profiles": account_profiles,
        "frozen_accounts": list(frozen_accounts),
        "predicted_next_hops": predicted_ids,
        "victim_id": victim_ids[0],
        "primary_mule": mule_ids[0],
        "sink_id": sink_ids[0],
    }


def find_longest_mule_chain(data: dict) -> list[str]:
    """Find the longest chain of suspicious transactions (victim→mule→...→sink)."""
    # Build adjacency from suspicious transactions
    adj: dict[str, list[str]] = defaultdict(list)
    suspicious_nodes: set[str] = set()
    node_types: dict[str, str] = {}

    for n in data["nodes"]:
        node_types[n["id"]] = n["node_type"]

    for tx in data["transactions"]:
        if tx.get("is_suspicious"):
            adj[tx["from_account"]].append(tx["to_account"])
            suspicious_nodes.add(tx["from_account"])
            suspicious_nodes.add(tx["to_account"])

    # BFS/DFS from each victim to find the longest path
    victims = [n["id"] for n in data["nodes"] if n["node_type"] == "victim"]
    longest: list[str] = []

    for v in victims:
        # DFS iterative
        stack: list[tuple[str, list[str]]] = [(v, [v])]
        visited_in_path: set[str] = set()
        while stack:
            node, path = stack.pop()
            if len(path) > len(longest):
                longest = path[:]
            for neighbor in adj.get(node, []):
                if neighbor not in path:  # avoid cycles
                    stack.append((neighbor, path + [neighbor]))

    return longest


def generate_and_save(reports_dir: Path) -> dict:
    """Generate a new scenario, save to disk, return data + metadata."""
    gen_dir = reports_dir / "generated"
    gen_dir.mkdir(parents=True, exist_ok=True)

    data = generate_scenario()
    longest_chain = find_longest_mule_chain(data)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    filename = f"scenario_{timestamp}.json"
    filepath = gen_dir / filename

    with open(filepath, "w") as f:
        json.dump(data, f)

    return {
        "data": data,
        "metadata": {
            "file": str(filepath),
            "filename": filename,
            "node_count": len(data["nodes"]),
            "link_count": len(data["links"]),
            "transaction_count": len(data["transactions"]),
            "frozen_count": len(data["frozen_accounts"]),
            "longest_mule_chain": longest_chain,
            "chain_length": len(longest_chain),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    }
