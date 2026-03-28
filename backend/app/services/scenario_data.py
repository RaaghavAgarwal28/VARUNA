"""
VARUNA — Dynamic Fraud Scenario Generator
============================================
Generates a randomized mule-chain fraud scenario on every call.
Amounts, timestamps, bank assignments, account ages and dissipation
targets all vary per execution while preserving the multi-hop topology
that the detection/scoring engines depend on:

    VICTIM → PRIMARY_MULE → Branch-A / Branch-B → deeper layers → sinks + predicted hops

Architecture alignment:
  • The data foundation is *generated*, not hardcoded.
  • Every reset / inject produces a fresh scenario so the ML pipeline
    and 10-flag engine operate on genuinely different inputs each time.
"""
from __future__ import annotations

import hashlib
import random
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from app.models.schemas import GraphLink, GraphNode, Transaction


# ── Pool data for randomization ──

INDIAN_BANKS = [
    "State Bank of India", "Axis Bank", "HDFC Bank", "ICICI Bank",
    "Kotak Mahindra Bank", "Yes Bank", "Punjab National Bank",
    "Bank of Baroda", "Canara Bank", "IndusInd Bank",
    "Union Bank of India", "Bank of India", "Federal Bank",
    "IDBI Bank", "South Indian Bank",
]

CITY_CODES = [
    "HYD", "BLR", "KOL", "PUNE", "GGN", "DEL", "CCU", "JPR",
    "CHN", "MUM", "LKO", "NAG", "BHO", "PAT", "RNC", "JDH",
    "VIZ", "COI", "KOC", "AHM",
]

CHANNELS = ["UPI", "UPI Collect", "IMPS", "NEFT", "Wallet Transfer"]

SINK_TYPES = ["CRYPTO-RAMP", "WALLET-EXIT", "ATM-OFF", "FINTECH-OFF"]


def _tx_hash(tx_id: str) -> str:
    return f"SHA256-{hashlib.sha256(tx_id.encode()).hexdigest()[:16].upper()}"


def _iso_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def build_scenario() -> dict:
    """Generate a unique fraud scenario with randomized parameters."""

    # ── Pick random city codes (unique per role) ──
    cities = random.sample(CITY_CODES, 10)
    banks = random.sample(INDIAN_BANKS, min(len(INDIAN_BANKS), 12))

    # Account IDs
    victim_id = "VICTIM-A1"
    primary_mule = f"MULE-{cities[0]}-01"
    branch_a_mule = f"MULE-{cities[1]}-07"
    branch_b_mule = f"MULE-{cities[2]}-02"
    layer_a1 = f"MULE-{cities[3]}-11"
    layer_a2 = f"MULE-{cities[4]}-14"
    layer_b1 = f"MULE-{cities[5]}-55"
    layer_b2 = f"MULE-{cities[6]}-21"
    tail_mule = f"MULE-{cities[7]}-06"
    sink_type = random.choice(SINK_TYPES)
    sink_id = f"{sink_type}-{random.randint(1, 50):02d}"
    pred_1 = f"PRED-{cities[8]}-{random.randint(50, 99)}"
    pred_2 = f"PRED-{cities[9]}-{random.randint(50, 99)}"

    # Device IDs — shared device is key for F6 detection
    core_device = f"DEV-FRAUD-CORE-{uuid.uuid4().hex[:4].upper()}"
    edge_device_1 = f"DEV-FRAUD-EDGE-{uuid.uuid4().hex[:4].upper()}"
    edge_device_2 = f"DEV-FRAUD-EDGE-{uuid.uuid4().hex[:4].upper()}"

    account_profiles = {
        victim_id: {"created_days_ago": random.randint(300, 800), "device_id": f"DEV-VIC-{random.randint(1,999):03d}"},
        primary_mule: {"created_days_ago": random.randint(3, 15), "device_id": core_device},
        branch_a_mule: {"created_days_ago": random.randint(5, 20), "device_id": core_device},
        branch_b_mule: {"created_days_ago": random.randint(5, 18), "device_id": edge_device_1},
        layer_a1: {"created_days_ago": random.randint(2, 10), "device_id": core_device},
        layer_a2: {"created_days_ago": random.randint(2, 8), "device_id": core_device},
        layer_b1: {"created_days_ago": random.randint(3, 12), "device_id": edge_device_1},
        layer_b2: {"created_days_ago": random.randint(5, 18), "device_id": core_device},
        tail_mule: {"created_days_ago": random.randint(10, 25), "device_id": edge_device_2},
        sink_id: {"created_days_ago": random.randint(100, 400), "device_id": f"DEV-SINK-{random.randint(1,99):02d}"},
        pred_1: {"created_days_ago": random.randint(1, 8), "device_id": core_device},
        pred_2: {"created_days_ago": random.randint(1, 5), "device_id": edge_device_2},
    }

    # ── Randomized amounts ──
    initial_amount = random.randint(80_000, 250_000)
    # Primary mule keeps a cut, splits rest
    branch_a_amount = int(initial_amount * random.uniform(0.55, 0.75))
    branch_b_amount = initial_amount - branch_a_amount - random.randint(1000, 5000)

    layer_a1_amount = int(branch_a_amount * random.uniform(0.45, 0.65))
    layer_a2_amount = branch_a_amount - layer_a1_amount - random.randint(500, 3000)

    # One dissipation sink (off-ramp)
    dissipated_amount = int(branch_b_amount * random.uniform(0.6, 0.9))

    layer_b1_amount = int(layer_a1_amount * random.uniform(0.3, 0.5))
    layer_b2_amount = int(layer_a2_amount * random.uniform(0.35, 0.55))
    tail_amount = int(layer_a2_amount * random.uniform(0.25, 0.4))
    tail_sink_amount = max(tail_amount - random.randint(50, 300), 500)

    # ── Randomized timestamps (burst within ~3 minutes) ──
    base_time = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(
        minutes=random.randint(5, 120)
    )

    def _offset(seconds_min: int, seconds_max: int) -> datetime:
        return base_time + timedelta(seconds=random.randint(seconds_min, seconds_max))

    # Assign banks (ensure cross-bank for F5 triggers)
    def _pick_banks(n: int) -> list[str]:
        return random.sample(banks, min(n, len(banks)))

    b = _pick_banks(10)

    # ── Build transactions ──
    tx_counter = random.randint(1000, 9999)

    def _tx_id():
        nonlocal tx_counter
        tx_counter += 1
        return f"TX-{tx_counter}"

    transactions = [
        # Hop 1: Victim → Primary
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(0, 5)),
            from_account=victim_id,
            to_account=primary_mule,
            amount=initial_amount,
            bank_from=b[0],
            bank_to=b[1],
            channel=random.choice(["UPI Collect", "UPI"]),
            status="flagged",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 2a: Primary → Branch A
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(20, 40)),
            from_account=primary_mule,
            to_account=branch_a_mule,
            amount=branch_a_amount,
            bank_from=b[1],
            bank_to=b[2],
            channel="IMPS",
            status="flagged",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 2b: Primary → Branch B
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(35, 55)),
            from_account=primary_mule,
            to_account=branch_b_mule,
            amount=branch_b_amount,
            bank_from=b[1],
            bank_to=b[3],
            channel=random.choice(["UPI", "IMPS"]),
            status="flagged",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 3a: Branch A → Layer A1
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(55, 75)),
            from_account=branch_a_mule,
            to_account=layer_a1,
            amount=layer_a1_amount,
            bank_from=b[2],
            bank_to=b[4],
            channel="IMPS",
            status="flagged",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 3b: Branch A → Layer A2
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(70, 90)),
            from_account=branch_a_mule,
            to_account=layer_a2,
            amount=layer_a2_amount,
            bank_from=b[2],
            bank_to=b[5],
            channel="UPI",
            status="flagged",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Off-ramp: Branch B → Sink (dissipation)
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(85, 110)),
            from_account=branch_b_mule,
            to_account=sink_id,
            amount=dissipated_amount,
            bank_from=b[3],
            bank_to="Fintech Settlement",
            channel="Wallet Transfer",
            status="dissipated",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 4a: Layer A1 → Layer B1
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(105, 130)),
            from_account=layer_a1,
            to_account=layer_b1,
            amount=layer_b1_amount,
            bank_from=b[4],
            bank_to=b[6],
            channel="UPI",
            status="processing",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 4b: Layer A2 → Layer B2
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(120, 145)),
            from_account=layer_a2,
            to_account=layer_b2,
            amount=layer_b2_amount,
            bank_from=b[5],
            bank_to=b[7],
            channel=random.choice(["NEFT", "IMPS"]),
            status="processing",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 4c: Layer A2 → Tail
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(135, 160)),
            from_account=layer_a2,
            to_account=tail_mule,
            amount=tail_amount,
            bank_from=b[5],
            bank_to=b[8],
            channel="UPI",
            status="processing",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
        # Hop 5: Tail → Sink (second dissipation attempt)
        Transaction(
            tx_id=_tx_id(),
            timestamp=_iso_ts(_offset(155, 180)),
            from_account=tail_mule,
            to_account=sink_id,
            amount=tail_sink_amount,
            bank_from=b[8],
            bank_to="Fintech Settlement",
            channel="Wallet Transfer",
            status="processing",
            is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter}"),
        ),
    ]

    # ── Build graph nodes from transactions ──
    balances: dict[str, float] = defaultdict(float)
    outgoing: Counter = Counter()
    incoming: Counter = Counter()
    account_banks: dict[str, str] = {}

    for tx in transactions:
        balances[tx.from_account] -= tx.amount
        balances[tx.to_account] += tx.amount
        outgoing[tx.from_account] += 1
        incoming[tx.to_account] += 1
        account_banks[tx.from_account] = tx.bank_from
        account_banks[tx.to_account] = tx.bank_to

    node_types = {
        victim_id: "victim",
        sink_id: "sink",
        pred_1: "predicted",
        pred_2: "predicted",
    }

    # Pick 2 random mule accounts to pre-freeze (simulates partial response)
    mule_account_ids = [
        a for a in account_banks if a != victim_id and a != sink_id
    ]
    frozen_accounts = set(random.sample(mule_account_ids, min(2, len(mule_account_ids))))

    nodes = []
    for account_id, bank in account_banks.items():
        node_type = node_types.get(account_id, "mule")
        status = "frozen" if account_id in frozen_accounts else "active"
        if node_type == "predicted":
            status = "predicted"
        nodes.append(
            GraphNode(
                id=account_id,
                label=account_id,
                bank=bank,
                node_type=node_type,
                balance=round(balances[account_id], 2),
                risk_score=0,
                human_coordination_score=0,
                dissipation_risk=0,
                status=status,
            )
        )

    # Add predicted next-hop nodes
    nodes.extend([
        GraphNode(
            id=pred_1,
            label=pred_1,
            bank=random.choice(banks),
            node_type="predicted",
            balance=0,
            risk_score=0,
            human_coordination_score=0,
            dissipation_risk=0,
            status="predicted",
        ),
        GraphNode(
            id=pred_2,
            label=pred_2,
            bank="Wallet Exit Rail",
            node_type="predicted",
            balance=0,
            risk_score=0,
            human_coordination_score=0,
            dissipation_risk=0,
            status="predicted",
        ),
    ])

    # Build links from transactions
    links = [
        GraphLink(
            source=tx.from_account,
            target=tx.to_account,
            amount=tx.amount,
            timestamp=tx.timestamp,
            hop=index // 3 + 1,
            status="frozen" if tx.to_account in frozen_accounts else "observed",
        )
        for index, tx in enumerate(transactions)
    ]
    # Predicted links
    links.extend([
        GraphLink(
            source=layer_b2,
            target=pred_1,
            amount=int(layer_b2_amount * random.uniform(0.6, 0.9)),
            timestamp=_iso_ts(_offset(175, 200)),
            hop=5,
            status="predicted",
        ),
        GraphLink(
            source=layer_b1,
            target=pred_2,
            amount=int(layer_b1_amount * random.uniform(0.7, 0.95)),
            timestamp=_iso_ts(_offset(180, 210)),
            hop=5,
            status="predicted",
        ),
    ])

    return {
        "transactions": transactions,
        "nodes": nodes,
        "links": links,
        "account_profiles": account_profiles,
        "frozen_accounts": frozen_accounts,
        "predicted_next_hops": [pred_1, pred_2],
        "victim_id": victim_id,
        "primary_mule": primary_mule,
        "sink_id": sink_id,
    }
