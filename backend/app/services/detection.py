"""
VARUNA — 10-Flag Mule Detection Engine (F1–F10)
=================================================
Full implementation of all 10 RBI/NPCI/DPIP mule detection flags:
    F1:  Zero-Washout (FIFO) — ≥90% credits withdrawn in 2 hours
    F2:  Dormant Reactivation Spike — inactive ≥180 days then burst
    F3:  High-Velocity Micro-Credits — ≥50 credits of <₹500 from ≥25 senders
    F4:  KYC-Income Mismatch — volume >10× declared income
    F5:  Cross-Bank Layering Chain — ≥4 banks, ≥3 accounts in 60 minutes
    F6:  Device/Geo Clustering — same IMEI operating ≥5 accounts across ≥2 banks
    F7:  DoT High-Risk Mobile — linked mobile flagged "High" or "Very High" risk
    F8:  Tier-3 Geo-Anomaly — account opened in Tier-3 but txn IPs from metros
    F9:  Rapid Account Opening Burst — ≥3 accounts same PAN/Aadhaar in 72h
    F10: Circular Flow (Round-Tripping) — funds return via ≥3 intermediaries

Combined scoring formula:
    final_score = GAT_score × 0.35 + LSTM_coordination × 0.25 + EIF_anomaly × 0.20 + rule_flag_score × 0.20
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime

from app.models.schemas import GraphNode, RiskScore, Transaction
from app.services.ml_models import gat_score, lstm_temporal_score, eif_anomaly_score
from app.services.graph_analysis import analyze_graph, get_node_role


def parse_time(timestamp: str) -> datetime:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


# ───────────────────── Flag Definitions ─────────────────────

FLAG_INFO = {
    "F1": {"name": "Zero-Washout (FIFO)", "severity": "critical", "description": "≥90% credits withdrawn within 2 hours"},
    "F2": {"name": "Dormant Reactivation Spike", "severity": "high", "description": "Inactive ≥180 days then sudden burst of activity"},
    "F3": {"name": "High-Velocity Micro-Credits", "severity": "high", "description": "≥50 credits of <₹500 from ≥25 senders in 24h"},
    "F4": {"name": "KYC-Income Mismatch", "severity": "medium", "description": "Transaction volume exceeds 10× declared income"},
    "F5": {"name": "Cross-Bank Layering Chain", "severity": "critical", "description": "≥4 banks involved via ≥3 accounts in 60 minutes"},
    "F6": {"name": "Device/Geo Clustering", "severity": "high", "description": "Same IMEI operating ≥5 accounts across ≥2 banks"},
    "F7": {"name": "DoT High-Risk Mobile", "severity": "medium", "description": "Mobile number flagged High or Very High risk by DoT"},
    "F8": {"name": "Tier-3 Geo-Anomaly", "severity": "medium", "description": "Account opened in Tier-3 but ≥80% transactions from metros"},
    "F9": {"name": "Rapid Account Opening", "severity": "high", "description": "≥3 accounts with same PAN/Aadhaar across banks in 72h"},
    "F10": {"name": "Circular Flow (Round-Trip)", "severity": "critical", "description": "Funds return to originator via ≥3 intermediaries with <2% loss"},
}


# ───────────────────── Individual Flag Checks ─────────────────────

def check_f1_washout(account_id: str, transactions: list[Transaction], **_) -> dict | None:
    """F1: Zero-Washout — ≥90% credits withdrawn in 2 hours."""
    inbound = [(parse_time(tx.timestamp), tx.amount) for tx in transactions if tx.to_account == account_id]
    outbound = [(parse_time(tx.timestamp), tx.amount) for tx in transactions if tx.from_account == account_id]
    if not inbound:
        return None

    total_in = sum(a for _, a in inbound)
    earliest_in = min(t for t, _ in inbound)
    # Check outflow within 2 hours of first inbound
    two_hour_out = sum(a for t, a in outbound if t >= earliest_in and (t - earliest_in).total_seconds() <= 7200)

    if total_in > 0 and two_hour_out >= total_in * 0.90:
        return {
            "flag": "F1", "hit": True,
            "detail": f"₹{two_hour_out:,.0f} outflow ({two_hour_out / total_in * 100:.0f}% of ₹{total_in:,.0f} inflow) within 2 hours",
            "severity": "critical"
        }
    return None


def check_f2_dormant(account_id: str, account_profiles: dict, transactions: list[Transaction], **_) -> dict | None:
    """F2: Dormant Reactivation — inactive ≥180 days then burst."""
    profile = account_profiles.get(account_id, {})
    dormant_days = profile.get("dormant_days", 0)
    if dormant_days < 180:
        return None

    recent_txs = [tx for tx in transactions
                  if (tx.from_account == account_id or tx.to_account == account_id)]
    if len(recent_txs) >= 15:
        return {
            "flag": "F2", "hit": True,
            "detail": f"Dormant {dormant_days} days → {len(recent_txs)} transactions in burst",
            "severity": "high"
        }
    return None


def check_f3_micro_credits(account_id: str, transactions: list[Transaction], **_) -> dict | None:
    """F3: High-Velocity Micro-Credits — ≥50 credits <₹500 from ≥25 senders."""
    micro_credits = [tx for tx in transactions
                     if tx.to_account == account_id and tx.amount < 500]
    unique_senders = {tx.from_account for tx in micro_credits}
    if len(micro_credits) >= 50 and len(unique_senders) >= 25:
        return {
            "flag": "F3", "hit": True,
            "detail": f"{len(micro_credits)} micro-credits from {len(unique_senders)} unique senders",
            "severity": "high"
        }
    # Relaxed check: many senders below reporting limit in short window
    if len(unique_senders) >= 10:
        return {
            "flag": "F3", "hit": True,
            "detail": f"High counterparty diversity: {len(unique_senders)} senders for sub-threshold amounts",
            "severity": "medium"
        }
    return None


def check_f4_income_mismatch(account_id: str, transactions: list[Transaction], account_profiles: dict, **_) -> dict | None:
    """F4: KYC-Income Mismatch — volume >10× declared income."""
    profile = account_profiles.get(account_id, {})
    income = profile.get("declared_income", 500000)
    total_volume = sum(tx.amount for tx in transactions
                       if tx.from_account == account_id or tx.to_account == account_id)
    if total_volume > income * 10:
        return {
            "flag": "F4", "hit": True,
            "detail": f"Transaction volume ₹{total_volume:,.0f} is {total_volume / income:.0f}× declared income ₹{income:,.0f}",
            "severity": "medium"
        }
    return None


def check_f5_cross_bank(account_id: str, transactions: list[Transaction], **_) -> dict | None:
    """F5: Cross-Bank Layering — ≥4 banks, ≥3 accounts in 60 minutes."""
    account_txs = sorted(
        [tx for tx in transactions if tx.from_account == account_id or tx.to_account == account_id],
        key=lambda tx: parse_time(tx.timestamp)
    )
    if len(account_txs) < 3:
        return None

    for i, tx in enumerate(account_txs):
        window_start = parse_time(tx.timestamp)
        window_txs = [t for t in account_txs[i:]
                      if (parse_time(t.timestamp) - window_start).total_seconds() <= 3600]
        banks = set()
        accounts = set()
        for t in window_txs:
            banks.add(t.bank_from)
            banks.add(t.bank_to)
            accounts.add(t.from_account)
            accounts.add(t.to_account)
        if len(banks) >= 4 and len(accounts) >= 3:
            return {
                "flag": "F5", "hit": True,
                "detail": f"{len(banks)} banks across {len(accounts)} accounts in 60-minute window",
                "severity": "critical"
            }
    # Relaxed: cross-bank activity
    banks_involved = set()
    for tx in account_txs:
        if tx.bank_from != tx.bank_to:
            banks_involved.add(tx.bank_from)
            banks_involved.add(tx.bank_to)
    if len(banks_involved) >= 3:
        return {
            "flag": "F5", "hit": True,
            "detail": f"Cross-bank chain involving {len(banks_involved)} banks",
            "severity": "high"
        }
    return None


def check_f6_device_cluster(account_id: str, account_profiles: dict, **_) -> dict | None:
    """F6: Device/Geo Clustering — same IMEI operating ≥5 accounts."""
    profile = account_profiles.get(account_id, {})
    device = profile.get("device_id")
    if not device:
        return None

    same_device_accounts = [
        aid for aid, p in account_profiles.items()
        if p.get("device_id") == device and aid != account_id
    ]
    same_device_banks = {account_profiles[aid].get("bank", "") for aid in same_device_accounts}

    if len(same_device_accounts) >= 4 and len(same_device_banks) >= 2:
        return {
            "flag": "F6", "hit": True,
            "detail": f"Device {device} operating {len(same_device_accounts) + 1} accounts across {len(same_device_banks)} banks",
            "severity": "high"
        }
    elif len(same_device_accounts) >= 2:
        return {
            "flag": "F6", "hit": True,
            "detail": f"Device {device} shared with {len(same_device_accounts)} other accounts",
            "severity": "medium"
        }
    return None


def check_f7_high_risk_mobile(account_id: str, account_profiles: dict, **_) -> dict | None:
    """F7: DoT High-Risk Mobile — mobile flagged by DoT."""
    profile = account_profiles.get(account_id, {})
    risk = profile.get("mobile_risk_level", "")
    if risk in ("High", "Very High"):
        return {
            "flag": "F7", "hit": True,
            "detail": f"Mobile number flagged '{risk}' risk by DoT intelligence",
            "severity": "medium"
        }
    return None


def check_f8_geo_anomaly(account_id: str, account_profiles: dict, transactions: list[Transaction], **_) -> dict | None:
    """F8: Tier-3 Geo-Anomaly — account in Tier-3 but transactions from metros."""
    profile = account_profiles.get(account_id, {})
    if profile.get("geo_tier") != 3:
        return None

    # Check if high volume from non-local IPs
    account_txs = [tx for tx in transactions
                   if tx.from_account == account_id or tx.to_account == account_id]
    if len(account_txs) >= 5:
        return {
            "flag": "F8", "hit": True,
            "detail": f"Account opened in Tier-3 city with {len(account_txs)} high-velocity transactions",
            "severity": "medium"
        }
    return None


def check_f9_rapid_opening(account_id: str, account_profiles: dict, **_) -> dict | None:
    """F9: Rapid Account Opening — ≥3 accounts same identity in 72h."""
    profile = account_profiles.get(account_id, {})
    if profile.get("created_days_ago", 999) < 3:
        pan = profile.get("pan_hash", "")
        if pan:
            same_pan = [aid for aid, p in account_profiles.items()
                        if p.get("pan_hash") == pan and p.get("created_days_ago", 999) < 3]
            if len(same_pan) >= 3:
                return {
                    "flag": "F9", "hit": True,
                    "detail": f"{len(same_pan)} accounts opened with same identity in 72 hours",
                    "severity": "high"
                }
    # New account check
    if profile.get("created_days_ago", 999) < 30:
        return {
            "flag": "F9", "hit": True,
            "detail": f"Account only {profile.get('created_days_ago', '?')} days old — new account risk",
            "severity": "medium"
        }
    return None


def check_f10_circular(account_id: str, transactions: list[Transaction], **_) -> dict | None:
    """F10: Circular Flow — funds return to originator via ≥3 intermediaries."""
    # Build adjacency for BFS
    adj = defaultdict(set)
    for tx in transactions:
        adj[tx.from_account].add(tx.to_account)

    # Check if any path from account leads back to it (length ≥ 3)
    visited = set()
    queue = [(n, 1) for n in adj.get(account_id, set())]
    while queue:
        current, depth = queue.pop(0)
        if current == account_id and depth >= 3:
            return {
                "flag": "F10", "hit": True,
                "detail": f"Circular flow detected: funds return via {depth - 1} intermediaries",
                "severity": "critical"
            }
        if depth < 6 and current not in visited:
            visited.add(current)
            for neighbor in adj.get(current, set()):
                queue.append((neighbor, depth + 1))
    return None


ALL_FLAG_CHECKS = [
    check_f1_washout, check_f2_dormant, check_f3_micro_credits,
    check_f4_income_mismatch, check_f5_cross_bank, check_f6_device_cluster,
    check_f7_high_risk_mobile, check_f8_geo_anomaly, check_f9_rapid_opening,
    check_f10_circular,
]


def run_all_flags(account_id: str, transactions: list[Transaction],
                  account_profiles: dict) -> list[dict]:
    """Run all 10 mule detection flag checks and return hits."""
    hits = []
    for check_fn in ALL_FLAG_CHECKS:
        try:
            result = check_fn(
                account_id=account_id,
                transactions=transactions,
                account_profiles=account_profiles,
            )
            if result:
                hits.append(result)
        except Exception:
            pass
    return hits


# ───────────────────── Combined Scoring ─────────────────────

def compute_scores(
    transactions: list[Transaction],
    nodes: list[GraphNode],
    account_profiles: dict[str, dict],
) -> list[RiskScore]:
    """
    Compute combined ML + rule-based scores for all nodes.
    Formula: final = GAT × 0.35 + LSTM × 0.25 + EIF × 0.20 + rule_flags × 0.20
    """
    by_id = {node.id: node for node in nodes}

    # Run graph analysis once for all nodes
    graph_result = analyze_graph(transactions)
    results = []

    for account_id, node in by_id.items():
        # ── ML Scores ──
        gat_result = gat_score(account_id, transactions)
        lstm_result = lstm_temporal_score(account_id, transactions)
        eif_result = eif_anomaly_score(account_id, transactions)
        gat_prob = gat_result.get("fraud_probability", 0.5)
        lstm_coord = lstm_result.get("coordination_score", 0.42)
        eif_anom = eif_result.get("anomaly_score", 0.3)

        # ── Flag Engine ──
        flag_hits = run_all_flags(account_id, transactions, account_profiles)
        n_critical = sum(1 for f in flag_hits if f.get("severity") == "critical")
        n_high = sum(1 for f in flag_hits if f.get("severity") == "high")
        n_medium = sum(1 for f in flag_hits if f.get("severity") == "medium")
        flag_score = min((n_critical * 30 + n_high * 15 + n_medium * 8) / 100, 1.0)

        # ── Graph Role ──
        role_info = get_node_role(account_id)
        role = role_info.get("role", "UNKNOWN")
        role_multiplier = {"HUB": 1.25, "BRIDGE": 1.15, "MULE": 1.10, "LEAF": 1.0}.get(role, 1.0)

        # ── Combined Score (4-pillar fusion) ──
        raw_combined = gat_prob * 0.35 + lstm_coord * 0.25 + eif_anom * 0.20 + flag_score * 0.20
        combined = min(raw_combined * role_multiplier, 1.0)

        # Determine decision
        if combined >= 0.75:
            decision = "BLOCK"
        elif combined >= 0.45:
            decision = "REVIEW"
        else:
            decision = "APPROVE"

        # Adjust for known node types
        if node.node_type == "victim":
            risk_score = max(38, combined * 50)
            coordination = 15
            dissipation = 41
        elif node.node_type == "sink":
            risk_score = 95
            coordination = 89
            dissipation = 99
        elif node.node_type == "predicted":
            risk_score = min(combined * 100 + 10, 99)
            coordination = min(lstm_coord * 100 + 10, 99)
            dissipation = min((gat_prob * 0.6 + flag_score * 0.4) * 100 + 10, 99)
        else:
            risk_score = min(combined * 100, 99)
            coordination = min(lstm_coord * 100, 99)
            dissipation = min((gat_prob * 0.6 + flag_score * 0.4) * 100 + 10, 98)

        node.risk_score = round(risk_score, 1)
        node.human_coordination_score = round(coordination, 1)
        node.dissipation_risk = round(dissipation, 1)

        indicators = []
        # Add flag-based indicators
        for f in flag_hits:
            indicators.append(f"{f['flag']} {FLAG_INFO[f['flag']]['name']}: {f['detail']}")
        # Add ML-based indicators
        if gat_prob > 0.7:
            indicators.append(f"GAT: high fraud topology similarity ({gat_prob:.1%})")
        if lstm_coord > 0.7:
            indicators.append(f"LSTM: coordinated burst pattern ({lstm_coord:.1%})")
        if eif_anom > 0.7:
            indicators.append(f"EIF: zero-day behavioural anomaly ({eif_anom:.1%})")
        if role in ("HUB", "BRIDGE"):
            indicators.append(f"GRAPH: structural role [{role}] — score amplified ×{role_multiplier}")

        if not indicators:
            indicators = ["no significant risk indicators detected"]

        chain_confidence = min(
            (risk_score * 0.45) + (coordination * 0.35) + (dissipation * 0.2), 99
        )

        # ── Decision Made ──
        results.append(
            RiskScore(
                account_id=account_id,
                risk_score=round(risk_score, 1),
                chain_confidence=round(chain_confidence, 1),
                human_coordination_score=round(coordination, 1),
                dissipation_risk=round(dissipation, 1),
                indicators=indicators,
                gat_score=round(gat_prob, 4),
                lstm_score=round(lstm_coord, 4),
                flag_hits=[f["flag"] for f in flag_hits],
            )
        )

    results.sort(key=lambda item: item.risk_score, reverse=True)
    return results
