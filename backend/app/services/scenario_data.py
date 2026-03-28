"""
VARUNA — Dynamic Fraud Scenario Generator (v2)
================================================
Generates a randomized mule-chain fraud scenario with a **different
topology** on every call.  The number of hops, branching factor, sink
placement, and predicted next-hop count all vary, producing visually
and structurally unique chains each time.
"""
from __future__ import annotations

import hashlib
import random
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from app.models.schemas import GraphLink, GraphNode, Transaction

# ── Pool data ──

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


def _tx_hash(seed: str) -> str:
    return f"SHA256-{hashlib.sha256(seed.encode()).hexdigest()[:16].upper()}"


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_id(role: str, used_cities: set) -> str:
    """Generate a unique MULE/PRED id with a random city."""
    avail = [c for c in CITY_CODES if c not in used_cities]
    if not avail:
        avail = CITY_CODES
    city = random.choice(avail)
    used_cities.add(city)
    num = random.randint(1, 99)
    return f"{role}-{city}-{num:02d}"


def build_scenario() -> dict:
    """Generate a unique fraud scenario with randomized topology."""

    used_cities: set[str] = set()
    banks = random.sample(INDIAN_BANKS, min(len(INDIAN_BANKS), 12))
    bank_idx = [0]

    def _next_bank() -> str:
        b = banks[bank_idx[0] % len(banks)]
        bank_idx[0] += 1
        return b

    # ── Topology parameters (randomized) ──
    # Number of branches from primary mule: 2-4
    num_branches = random.choice([2, 2, 3, 3, 4])
    # Depth of each branch: 1-3 additional hops
    branch_depths = [random.randint(1, 3) for _ in range(num_branches)]
    # Number of sinks: 1-2
    num_sinks = random.choice([1, 1, 2])
    # Number of predicted nodes: 1-3
    num_predicted = random.choice([1, 2, 2, 3])

    # ── Device clustering ──
    core_device = f"DEV-FRAUD-CORE-{uuid.uuid4().hex[:4].upper()}"
    edge_devices = [f"DEV-FRAUD-EDGE-{uuid.uuid4().hex[:4].upper()}" for _ in range(2)]

    # ── Build account tree ──
    victim_id = "VICTIM-A1"
    primary_id = _make_id("MULE", used_cities)

    # Branch heads
    branch_heads = [_make_id("MULE", used_cities) for _ in range(num_branches)]

    # Deeper layers per branch
    branch_layers: list[list[str]] = []
    for i, depth in enumerate(branch_depths):
        layers = []
        for _d in range(depth):
            layers.append(_make_id("MULE", used_cities))
        branch_layers.append(layers)

    # Sinks
    sinks = []
    for _ in range(num_sinks):
        st = random.choice(SINK_TYPES)
        sinks.append(f"{st}-{random.randint(1, 50):02d}")

    # Predicted next hops
    predicted = [_make_id("PRED", used_cities) for _ in range(num_predicted)]

    # ── Account profiles ──
    all_mule_ids = [primary_id] + branch_heads
    for layers in branch_layers:
        all_mule_ids.extend(layers)

    account_profiles = {
        victim_id: {
            "created_days_ago": random.randint(300, 800),
            "device_id": f"DEV-VIC-{random.randint(1, 999):03d}",
        },
    }
    for acc in all_mule_ids:
        account_profiles[acc] = {
            "created_days_ago": random.randint(2, 20),
            "device_id": random.choice([core_device] + edge_devices),
        }
    for s in sinks:
        account_profiles[s] = {
            "created_days_ago": random.randint(100, 400),
            "device_id": f"DEV-SINK-{random.randint(1, 99):02d}",
        }
    for p in predicted:
        account_profiles[p] = {
            "created_days_ago": random.randint(1, 8),
            "device_id": random.choice([core_device] + edge_devices),
        }

    # ── Randomized amounts ──
    initial_amount = random.randint(80_000, 250_000)

    # Split initial amount across branches
    cuts = sorted([random.random() for _ in range(num_branches - 1)])
    branch_fracs = []
    prev = 0.0
    for c in cuts:
        branch_fracs.append(c - prev)
        prev = c
    branch_fracs.append(1.0 - prev)

    # Small retention by primary mule
    forwarded = int(initial_amount * random.uniform(0.85, 0.95))
    branch_amounts = [max(int(forwarded * f), 1000) for f in branch_fracs]

    # ── Randomized timestamps ──
    base_time = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(
        minutes=random.randint(5, 120)
    )
    _ts_offset = [0]

    def _next_ts() -> str:
        _ts_offset[0] += random.randint(15, 45)
        return _iso(base_time + timedelta(seconds=_ts_offset[0]))

    # ── Build transactions ──
    tx_counter = [random.randint(1000, 9999)]

    def _tx_id() -> str:
        tx_counter[0] += 1
        return f"TX-{tx_counter[0]}"

    transactions: list[Transaction] = []

    # Hop 1: Victim → Primary
    transactions.append(Transaction(
        tx_id=_tx_id(), timestamp=_next_ts(),
        from_account=victim_id, to_account=primary_id,
        amount=initial_amount, bank_from=_next_bank(), bank_to=_next_bank(),
        channel=random.choice(["UPI Collect", "UPI"]),
        status="flagged", is_suspicious=True,
        tx_hash=_tx_hash(f"TX-{tx_counter[0]}"),
    ))

    # Hop 2: Primary → Branch heads
    for i, bh in enumerate(branch_heads):
        transactions.append(Transaction(
            tx_id=_tx_id(), timestamp=_next_ts(),
            from_account=primary_id, to_account=bh,
            amount=branch_amounts[i], bank_from=transactions[0].bank_to, bank_to=_next_bank(),
            channel=random.choice(CHANNELS),
            status="flagged", is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter[0]}"),
        ))

    # Deeper hops: Branch head → Layer 1 → Layer 2 → ...
    leaf_nodes: list[tuple[str, int]] = []  # (account_id, remaining_amount)
    for i, layers in enumerate(branch_layers):
        src = branch_heads[i]
        remaining = branch_amounts[i]
        for layer_acc in layers:
            forwarded_amt = int(remaining * random.uniform(0.6, 0.85))
            transactions.append(Transaction(
                tx_id=_tx_id(), timestamp=_next_ts(),
                from_account=src, to_account=layer_acc,
                amount=forwarded_amt,
                bank_from=_next_bank(), bank_to=_next_bank(),
                channel=random.choice(CHANNELS),
                status=random.choice(["flagged", "processing"]),
                is_suspicious=True,
                tx_hash=_tx_hash(f"TX-{tx_counter[0]}"),
            ))
            src = layer_acc
            remaining = forwarded_amt
        leaf_nodes.append((src, remaining))

    # Dissipation: Random leaf nodes → Sinks
    sink_targets = random.sample(
        range(len(leaf_nodes)),
        min(num_sinks, len(leaf_nodes)),
    )
    for si, li in enumerate(sink_targets):
        leaf_acc, leaf_amt = leaf_nodes[li]
        sink_acc = sinks[si % len(sinks)]
        dissip_amt = int(leaf_amt * random.uniform(0.6, 0.9))
        transactions.append(Transaction(
            tx_id=_tx_id(), timestamp=_next_ts(),
            from_account=leaf_acc, to_account=sink_acc,
            amount=dissip_amt,
            bank_from=_next_bank(), bank_to="Fintech Settlement",
            channel="Wallet Transfer",
            status="dissipated", is_suspicious=True,
            tx_hash=_tx_hash(f"TX-{tx_counter[0]}"),
        ))

    # ── Build graph ──
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

    node_types: dict[str, str] = {victim_id: "victim"}
    for s in sinks:
        node_types[s] = "sink"
    for p in predicted:
        node_types[p] = "predicted"

    # Randomly freeze 1-2 mule accounts
    mule_ids = [a for a in account_banks if a not in node_types]
    frozen_accounts = set(random.sample(mule_ids, min(random.randint(1, 2), len(mule_ids))))

    nodes = []
    for acc, bank in account_banks.items():
        ntype = node_types.get(acc, "mule")
        status = "frozen" if acc in frozen_accounts else ("predicted" if ntype == "predicted" else "active")
        nodes.append(GraphNode(
            id=acc, label=acc, bank=bank, node_type=ntype,
            balance=round(balances[acc], 2), risk_score=0,
            human_coordination_score=0, dissipation_risk=0, status=status,
        ))

    # Predicted nodes (not yet in account_banks)
    for p in predicted:
        nodes.append(GraphNode(
            id=p, label=p,
            bank=random.choice(banks) if random.random() > 0.3 else "Wallet Exit Rail",
            node_type="predicted", balance=0, risk_score=0,
            human_coordination_score=0, dissipation_risk=0, status="predicted",
        ))

    # Links from transactions
    links = []
    for idx, tx in enumerate(transactions):
        hop = 1
        if tx.from_account == victim_id:
            hop = 1
        elif tx.from_account == primary_id:
            hop = 2
        else:
            hop = min(idx // 2 + 1, 6)
        links.append(GraphLink(
            source=tx.from_account, target=tx.to_account,
            amount=tx.amount, timestamp=tx.timestamp, hop=hop,
            status="frozen" if tx.to_account in frozen_accounts else "observed",
        ))

    # Predicted links: pick random leaf nodes → predicted nodes
    pred_sources = random.sample(
        [ln[0] for ln in leaf_nodes],
        min(len(predicted), len(leaf_nodes)),
    )
    for i, pred_acc in enumerate(predicted):
        src = pred_sources[i % len(pred_sources)]
        links.append(GraphLink(
            source=src, target=pred_acc,
            amount=int(random.uniform(5000, 30000)),
            timestamp=_next_ts(), hop=6, status="predicted",
        ))

    return {
        "transactions": transactions,
        "nodes": nodes,
        "links": links,
        "account_profiles": account_profiles,
        "frozen_accounts": frozen_accounts,
        "predicted_next_hops": predicted,
        "victim_id": victim_id,
        "primary_mule": primary_id,
        "sink_id": sinks[0] if sinks else "",
    }
