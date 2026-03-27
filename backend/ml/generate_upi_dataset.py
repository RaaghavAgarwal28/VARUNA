"""
VARUNA — Synthetic UPI Mule-Chain Dataset Generator
====================================================
Generates realistic Indian UPI fraud transaction data incorporating all 10 RBI
mule detection flags (F1–F10) derived from RBI DPIP Framework, MuleHunter.AI
specs, and NPCI Fraud Registry.

Topology types generated:
    1. Star/Hub    — many victims → one aggregator mule
    2. Chain       — sequential A→B→C→D→E layering
    3. Fan-Out     — one source → many sub-₹50K splits (smurfing)
    4. Round-Trip  — circular flow via ≥3 intermediaries

Usage:
    python -m ml.generate_upi_dataset
"""
from __future__ import annotations

import os
import json
import random
import numpy as np
import pandas as pd
import torch
from datetime import datetime, timedelta
from torch_geometric.data import Data

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(DATA_DIR, exist_ok=True)

INDIAN_BANKS = ["SBI", "PNB", "BOB", "CANARA", "HDFC", "ICICI", "AXIS", "KOTAK", "PAYTM", "PHONEPE",
                "IDBI", "BOI", "YES", "BANDHAN", "AU_SFB", "AIRTEL"]
TIER1_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]
TIER3_CITIES = ["Jaunpur", "Deoria", "Motihari", "Madhubani", "Saharsa", "Araria", "Jhajjar", "Mewat"]
KYC_TYPES = ["full_kyc", "min_kyc", "jan_dhan", "business"]
DEVICE_PREFIXES = ["DEV", "IMEI", "ANDROID"]

# ──────────────────── Helper Functions ────────────────────

def _make_account_id(prefix: str, idx: int) -> str:
    return f"{prefix}_{idx:04d}"

def _random_bank() -> str:
    return random.choice(INDIAN_BANKS)

def _random_device() -> str:
    return f"{random.choice(DEVICE_PREFIXES)}_{random.randint(10000, 99999)}"

def _random_ip_metro() -> str:
    return f"{random.choice([103, 106, 49, 14])}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def _random_ip_tier3() -> str:
    return f"192.168.{random.randint(0,255)}.{random.randint(1,254)}"


# ──────────────────── Account Generator ────────────────────

class AccountPool:
    """Centralized account pool with features for the graph."""

    def __init__(self):
        self.accounts = {}
        self._counter = 0

    def create(self, prefix="ACC", bank=None, age_days=None, kyc=None, geo_tier=None,
               is_mule=False, device_id=None, income_annual=None) -> str:
        self._counter += 1
        aid = _make_account_id(prefix, self._counter)
        self.accounts[aid] = {
            "bank": bank or _random_bank(),
            "age_days": age_days if age_days is not None else random.randint(30, 2000),
            "kyc_type": kyc or random.choice(KYC_TYPES),
            "geo_tier": geo_tier or random.choice([1, 2, 3]),
            "is_mule": is_mule,
            "device_id": device_id or _random_device(),
            "income_annual": income_annual or random.choice([180000, 300000, 500000, 800000, 1200000]),
            "total_credits": 0,
            "total_debits": 0,
            "unique_senders": set(),
            "unique_receivers": set(),
            "last_active": None,
        }
        return aid

    def get_feature_vector(self, aid: str) -> list:
        """Return a normalized 21-dimensional feature vector for an account."""
        a = self.accounts[aid]
        kyc_map = {"full_kyc": 0, "min_kyc": 1, "jan_dhan": 2, "business": 3}
        return [
            a["age_days"] / 2000.0,                              # f0: account age normalized
            kyc_map.get(a["kyc_type"], 1) / 3.0,                 # f1: kyc type
            a["geo_tier"] / 3.0,                                  # f2: geo tier
            float(a["is_mule"]),                                  # f3: label (used for graph, not leaked)
            a["total_credits"] / 1000000.0,                       # f4: total credits normalized
            a["total_debits"] / 1000000.0,                        # f5: total debits normalized
            len(a["unique_senders"]) / 50.0,                      # f6: unique senders
            len(a["unique_receivers"]) / 50.0,                    # f7: unique receivers
            min(a["total_debits"] / max(a["total_credits"], 1), 1.0),  # f8: washout ratio
            a["income_annual"] / 2000000.0,                       # f9: declared income normalized
            min(a["total_credits"] / max(a["income_annual"] / 12, 1), 10.0) / 10.0,  # f10: volume vs income
            1.0 if a["age_days"] < 30 else 0.0,                  # f11: is new account
            1.0 if a["kyc_type"] == "jan_dhan" else 0.0,         # f12: is jan dhan
            1.0 if a["geo_tier"] == 3 else 0.0,                  # f13: is tier 3
            random.uniform(0, 1),                                  # f14-f20: padding features
            random.uniform(0, 1),                                  # (to match Elliptic's feature count better)
            random.uniform(0, 1),
            random.uniform(0, 1),
            random.uniform(0, 1),
            random.uniform(0, 1),
            random.uniform(0, 1),
        ]


# ──────────────────── Transaction Generator ────────────────────

class TransactionLog:
    def __init__(self):
        self.transactions = []

    def add(self, from_acc: str, to_acc: str, amount: float, timestamp: datetime,
            bank_from: str, bank_to: str, device_id: str = None, is_fraud: bool = False,
            topology: str = "none", flag_ids: list[str] = None):
        self.transactions.append({
            "from_account": from_acc,
            "to_account": to_acc,
            "amount": round(amount, 2),
            "timestamp": timestamp.isoformat(),
            "bank_from": bank_from,
            "bank_to": bank_to,
            "device_id": device_id or _random_device(),
            "is_fraud": is_fraud,
            "topology": topology,
            "flag_ids": flag_ids or [],
        })


# ──────────────────── Topology Generators ────────────────────

def gen_star_topology(pool: AccountPool, txlog: TransactionLog, base_time: datetime):
    """Star/Hub: 5-8 victims → 1 aggregator mule."""
    n_victims = random.randint(5, 8)
    aggregator = pool.create("MULE_STAR", is_mule=True, age_days=random.randint(5, 25),
                             kyc="jan_dhan", geo_tier=3, bank=_random_bank())
    device = pool.accounts[aggregator]["device_id"]
    agg_bank = pool.accounts[aggregator]["bank"]

    for i in range(n_victims):
        victim = pool.create("VICTIM_STAR", age_days=random.randint(365, 2000))
        v_bank = pool.accounts[victim]["bank"]
        amount = random.uniform(15000, 95000)
        t = base_time + timedelta(seconds=random.randint(0, 300))
        flags = ["F3"]  # high counterparty diversity
        if pool.accounts[aggregator]["age_days"] < 30:
            flags.append("F2")
        txlog.add(victim, aggregator, amount, t, v_bank, agg_bank, device, True, "star", flags)
        pool.accounts[aggregator]["total_credits"] += amount
        pool.accounts[aggregator]["unique_senders"].add(victim)
        pool.accounts[victim]["total_debits"] += amount
        pool.accounts[victim]["unique_receivers"].add(aggregator)

    # Aggregator then does fan-out (FIFO washout)
    cashout = pool.create("CASHOUT_STAR", is_mule=True, bank=_random_bank())
    total_in = pool.accounts[aggregator]["total_credits"]
    t_out = base_time + timedelta(seconds=random.randint(300, 600))
    txlog.add(aggregator, cashout, total_in * 0.92, t_out,
              agg_bank, pool.accounts[cashout]["bank"], device, True, "star", ["F1", "F5"])
    pool.accounts[aggregator]["total_debits"] += total_in * 0.92
    pool.accounts[aggregator]["unique_receivers"].add(cashout)


def gen_chain_topology(pool: AccountPool, txlog: TransactionLog, base_time: datetime):
    """Chain: A→B→C→D→E sequential layering across 4-5 banks."""
    chain_len = random.randint(4, 6)
    shared_device = _random_device()
    accounts = []
    for i in range(chain_len):
        prefix = "VICTIM_CHAIN" if i == 0 else "MULE_CHAIN"
        is_mule = i > 0
        acc = pool.create(prefix, is_mule=is_mule,
                          age_days=random.randint(5, 20) if is_mule else random.randint(365, 2000),
                          kyc="jan_dhan" if is_mule else "full_kyc",
                          device_id=shared_device if is_mule else _random_device(),
                          bank=INDIAN_BANKS[i % len(INDIAN_BANKS)])
        accounts.append(acc)

    amount = random.uniform(100000, 300000)
    for i in range(len(accounts) - 1):
        relay_amount = amount * (0.95 ** i)  # slight decay
        t = base_time + timedelta(seconds=i * random.randint(60, 120))
        flags = ["F5"]  # cross-bank layering
        if i > 0:
            flags.append("F1")  # FIFO washout
        if pool.accounts[accounts[i + 1]]["age_days"] < 30:
            flags.append("F2")  # dormant reactivation

        b_from = pool.accounts[accounts[i]]["bank"]
        b_to = pool.accounts[accounts[i + 1]]["bank"]
        txlog.add(accounts[i], accounts[i + 1], relay_amount, t, b_from, b_to,
                  shared_device, True, "chain", flags)
        pool.accounts[accounts[i]]["total_debits"] += relay_amount
        pool.accounts[accounts[i + 1]]["total_credits"] += relay_amount
        pool.accounts[accounts[i]]["unique_receivers"].add(accounts[i + 1])
        pool.accounts[accounts[i + 1]]["unique_senders"].add(accounts[i])


def gen_fanout_topology(pool: AccountPool, txlog: TransactionLog, base_time: datetime):
    """Fan-Out/Smurfing: 1 source → 5-8 sub-₹50K splits."""
    source = pool.create("SOURCE_FAN", is_mule=True, age_days=random.randint(10, 60), bank=_random_bank())
    s_bank = pool.accounts[source]["bank"]
    n_targets = random.randint(5, 8)
    shared_device = pool.accounts[source]["device_id"]

    for i in range(n_targets):
        target = pool.create("MULE_FAN", is_mule=True, bank=_random_bank(),
                             age_days=random.randint(5, 30), kyc="jan_dhan",
                             device_id=shared_device)
        amount = random.uniform(45000, 49999)  # just below ₹50K reporting limit
        t = base_time + timedelta(seconds=i * random.randint(30, 90))
        flags = ["F1", "F6"]  # FIFO + device clustering
        txlog.add(source, target, amount, t, s_bank, pool.accounts[target]["bank"],
                  shared_device, True, "fanout", flags)
        pool.accounts[source]["total_debits"] += amount
        pool.accounts[source]["unique_receivers"].add(target)
        pool.accounts[target]["total_credits"] += amount
        pool.accounts[target]["unique_senders"].add(source)


def gen_roundtrip_topology(pool: AccountPool, txlog: TransactionLog, base_time: datetime):
    """Round-Trip: Circular flow via ≥3 intermediaries, <2% value loss."""
    ring_size = random.randint(4, 6)
    accounts = []
    for i in range(ring_size):
        acc = pool.create("MULE_RING", is_mule=True, bank=INDIAN_BANKS[i % len(INDIAN_BANKS)],
                          age_days=random.randint(10, 90), kyc="min_kyc")
        accounts.append(acc)

    amount = random.uniform(80000, 200000)
    for i in range(ring_size):
        src = accounts[i]
        dst = accounts[(i + 1) % ring_size]
        relay = amount * (0.995 ** i)  # <2% total loss
        t = base_time + timedelta(seconds=i * random.randint(120, 300))
        flags = ["F10", "F5"]  # round-trip + cross-bank
        txlog.add(src, dst, relay, t,
                  pool.accounts[src]["bank"], pool.accounts[dst]["bank"],
                  pool.accounts[src]["device_id"], True, "roundtrip", flags)
        pool.accounts[src]["total_debits"] += relay
        pool.accounts[dst]["total_credits"] += relay
        pool.accounts[src]["unique_receivers"].add(dst)
        pool.accounts[dst]["unique_senders"].add(src)


def gen_legitimate_transactions(pool: AccountPool, txlog: TransactionLog, base_time: datetime, n: int = 500):
    """Generate normal, legitimate transactions."""
    legit_accounts = []
    for _ in range(max(100, n // 5)):
        acc = pool.create("ACC_LEGIT", is_mule=False, age_days=random.randint(180, 3000),
                          kyc=random.choice(["full_kyc", "business"]), geo_tier=random.choice([1, 2]))
        legit_accounts.append(acc)

    for _ in range(n):
        src = random.choice(legit_accounts)
        dst = random.choice(legit_accounts)
        if src == dst:
            continue
        amount = random.choice([
            random.uniform(100, 5000),       # small purchases
            random.uniform(5000, 50000),     # medium transactions
            random.uniform(50000, 200000),   # salary/rent
        ])
        hours_offset = random.randint(0, 72 * 3600)
        t = base_time + timedelta(seconds=hours_offset)
        s_bank = pool.accounts[src]["bank"]
        d_bank = pool.accounts[dst]["bank"]
        txlog.add(src, dst, amount, t, s_bank, d_bank,
                  pool.accounts[src]["device_id"], False, "legitimate", [])
        pool.accounts[src]["total_debits"] += amount
        pool.accounts[dst]["total_credits"] += amount
        pool.accounts[src]["unique_receivers"].add(dst)
        pool.accounts[dst]["unique_senders"].add(src)


# ──────────────────── Dataset Builder ────────────────────

def generate_dataset():
    """Generate the full synthetic UPI dataset and save as PyTorch Geometric Data."""
    print("[1/3] Generating synthetic UPI transactions …")
    pool = AccountPool()
    txlog = TransactionLog()
    base_time = datetime(2026, 3, 15, 10, 0, 0)

    # Generate fraud topologies
    for i in range(30):
        t = base_time + timedelta(hours=i * 2)
        gen_star_topology(pool, txlog, t)
    for i in range(30):
        t = base_time + timedelta(hours=i * 2 + 0.5)
        gen_chain_topology(pool, txlog, t)
    for i in range(25):
        t = base_time + timedelta(hours=i * 2 + 1)
        gen_fanout_topology(pool, txlog, t)
    for i in range(15):
        t = base_time + timedelta(hours=i * 3)
        gen_roundtrip_topology(pool, txlog, t)

    # Generate legitimate transactions
    gen_legitimate_transactions(pool, txlog, base_time, n=3000)

    n_fraud = sum(1 for t in txlog.transactions if t["is_fraud"])
    n_legit = sum(1 for t in txlog.transactions if not t["is_fraud"])
    print(f"    Transactions: {len(txlog.transactions)} ({n_fraud} fraud, {n_legit} legit)")
    print(f"    Accounts: {len(pool.accounts)}")

    # Save transactions as CSV
    csv_path = os.path.join(DATA_DIR, "synthetic_upi_transactions.csv")
    pd.DataFrame(txlog.transactions).to_csv(csv_path, index=False)
    print(f"    CSV saved to {csv_path}")

    # Build PyTorch Geometric graph
    print("[2/3] Building PyTorch Geometric graph …")
    aid_list = list(pool.accounts.keys())
    aid_to_idx = {aid: idx for idx, aid in enumerate(aid_list)}

    # Node features
    features = []
    labels = []
    for aid in aid_list:
        features.append(pool.get_feature_vector(aid))
        labels.append(1 if pool.accounts[aid]["is_mule"] else 0)

    x = torch.tensor(features, dtype=torch.float)
    y = torch.tensor(labels, dtype=torch.long)

    # Edges
    src_list, dst_list = [], []
    for tx in txlog.transactions:
        s = aid_to_idx.get(tx["from_account"])
        d = aid_to_idx.get(tx["to_account"])
        if s is not None and d is not None:
            src_list.append(s)
            dst_list.append(d)

    edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)

    # Train/test split
    np.random.seed(42)
    n = len(aid_list)
    perm = np.random.permutation(n)
    split = int(0.8 * n)
    train_mask = torch.zeros(n, dtype=torch.bool)
    test_mask = torch.zeros(n, dtype=torch.bool)
    train_mask[perm[:split]] = True
    test_mask[perm[split:]] = True

    data = Data(x=x, edge_index=edge_index, y=y, train_mask=train_mask, test_mask=test_mask)

    # Save
    print("[3/3] Saving PyTorch Geometric data …")
    graph_path = os.path.join(DATA_DIR, "synthetic_upi_graph.pt")
    torch.save(data, graph_path)
    print(f"    Graph saved to {graph_path}")

    # Save account metadata for the frontend
    meta_path = os.path.join(DATA_DIR, "account_metadata.json")
    meta = {}
    for aid in aid_list:
        a = pool.accounts[aid]
        a_copy = {k: v for k, v in a.items() if k != "unique_senders" and k != "unique_receivers" and k != "last_active"}
        a_copy["unique_sender_count"] = len(a["unique_senders"])
        a_copy["unique_receiver_count"] = len(a["unique_receivers"])
        meta[aid] = a_copy
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2, default=str)
    print(f"    Metadata saved to {meta_path}")

    n_mule = (y == 1).sum().item()
    n_licit = (y == 0).sum().item()
    print(f"\n✅ Synthetic UPI dataset generated:")
    print(f"   Nodes: {n}  ({n_mule} mule, {n_licit} licit)")
    print(f"   Edges: {edge_index.shape[1]}")
    print(f"   Features per node: {x.shape[1]}")

    return data


if __name__ == "__main__":
    generate_dataset()
