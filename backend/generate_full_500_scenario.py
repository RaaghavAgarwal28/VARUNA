import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict

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

def generate_network(num_nodes=500):
    used_cities = set()
    def _make_id(role):
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
    account_profiles = {}
    nodes = []
    account_banks = {}
    balances = defaultdict(float)
    
    for aid in all_acc:
        if aid in victim_ids:
            ntype = "victim"
            risk = random.randint(70, 99)
            bank = random.choice(INDIAN_BANKS)
            appr = {"created_days_ago": random.randint(300, 800), "device_id": f"DEV-{random.randint(1000,9999)}"}
        elif aid in mule_ids:
            ntype = "mule"
            risk = random.randint(80, 99)
            bank = random.choice(INDIAN_BANKS)
            appr = {"created_days_ago": random.randint(2, 20), "device_id": f"DEV-CORE-{random.randint(10,99)}"}
        elif aid in sink_ids:
            ntype = "sink"
            risk = random.randint(90, 99)
            bank = "Fintech Settlement"
            appr = {"created_days_ago": random.randint(100, 400), "device_id": f"DEV-SINK-{random.randint(10,99)}"}
        else:
            ntype = "predicted"
            risk = random.randint(5, 40)
            bank = random.choice(INDIAN_BANKS)
            appr = {"created_days_ago": random.randint(100, 500), "device_id": f"DEV-NORM-{random.randint(1000,9999)}"}
            
        account_profiles[aid] = appr
        account_banks[aid] = bank

    # 3. Build Transactions simulating money flow
    transactions = []
    tx_counter = 1000
    base_time = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=180)
    time_offset = 0
    
    def _next_ts():
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
        if random.random() < 0.6:  # Send deeper to other mules
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

    # Add background noise (Normal/Predicted)
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

    # 4. Compute Links and Balances from Transactions
    for tx in transactions:
        balances[tx["from_account"]] -= tx["amount"]
        balances[tx["to_account"]] += tx["amount"]
        
    # Freezes
    frozen_accounts = set(random.sample(mule_ids, 5))

    links = []
    # Build links from transactions
    for idx, tx in enumerate(transactions):
        links.append({
            "source": tx["from_account"],
            "target": tx["to_account"],
            "amount": tx["amount"],
            "timestamp": tx["timestamp"],
            "hop": min(idx // 100 + 1, 6),
            "status": "frozen" if tx["to_account"] in frozen_accounts else "observed"
        })

    # Extra predicted links from some mules to predicted nodes
    for p in predicted_ids:
        if random.random() < 0.1:  # 10% chance a mule is connected to a predicted next hop
            src = random.choice(mule_ids)
            links.append({
                "source": src,
                "target": p,
                "amount": random.randint(5000, 50000),
                "timestamp": _next_ts(),
                "hop": 6,
                "status": "predicted"
            })

    # Build final nodes array
    for aid in all_acc:
        if aid in victim_ids: ntype = "victim"
        elif aid in mule_ids: ntype = "mule"
        elif aid in sink_ids: ntype = "sink"
        else: ntype = "predicted"
            
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

    data = {
        "transactions": transactions,
        "nodes": nodes,
        "links": links,
        "account_profiles": account_profiles,
        "frozen_accounts": list(frozen_accounts),
        "predicted_next_hops": predicted_ids,
        "victim_id": victim_ids[0],
        "primary_mule": mule_ids[0],
        "sink_id": sink_ids[0]
    }
    
    out_path = "ml/data/static_500_scenario.json"
    with open(out_path, "w") as f:
        json.dump(data, f)
        
    print(f"Generated {len(nodes)} nodes, {len(links)} links, and {len(transactions)} transactions.")
    print(f"Saved to {out_path}.")

if __name__ == "__main__":
    generate_network()
