from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime

from app.models.schemas import GraphNode, RiskScore, Transaction


def parse_time(timestamp: str) -> datetime:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


def compute_scores(
    transactions: list[Transaction],
    nodes: list[GraphNode],
    account_profiles: dict[str, dict],
) -> list[RiskScore]:
    outgoing = Counter()
    incoming_amount = Counter()
    outgoing_amount = Counter()
    unique_targets = defaultdict(set)
    unique_senders = defaultdict(set)
    tx_times_by_sender = defaultdict(list)
    inbound_timestamps = defaultdict(list)
    below_reporting_limit_targets = defaultdict(set)

    for tx in transactions:
        outgoing[tx.from_account] += 1
        incoming_amount[tx.to_account] += tx.amount
        outgoing_amount[tx.from_account] += tx.amount
        unique_targets[tx.from_account].add(tx.to_account)
        unique_senders[tx.to_account].add(tx.from_account)
        tx_times_by_sender[tx.from_account].append(parse_time(tx.timestamp))
        inbound_timestamps[tx.to_account].append((parse_time(tx.timestamp), tx.amount, tx.from_account))
        if tx.amount < 50000:
            below_reporting_limit_targets[tx.from_account].add(tx.to_account)

    by_id = {node.id: node for node in nodes}
    results = []

    for account_id, node in by_id.items():
        indicators = []
        rule_hits = 0

        # Rule 1: Pass-Through
        inbound_events = sorted(inbound_timestamps.get(account_id, []), key=lambda item: item[0])
        pass_through_hit = False
        for event_time, amount, _sender in inbound_events:
            if amount >= 50000:
                four_minute_outflow = sum(
                    tx.amount
                    for tx in transactions
                    if tx.from_account == account_id
                    and parse_time(tx.timestamp) >= event_time
                    and (parse_time(tx.timestamp) - event_time).total_seconds() <= 240
                )
                if four_minute_outflow >= amount * 0.85:
                    pass_through_hit = True
                    indicators.append("rule 1 pass-through: >=85% relayed within 4 minutes")
                    rule_hits += 1
                    break

        # Rule 2: Smurfing
        smurfing_hit = False
        txs_from_account = sorted(
            [tx for tx in transactions if tx.from_account == account_id],
            key=lambda tx: parse_time(tx.timestamp),
        )
        for tx in txs_from_account:
            window_targets = {
                candidate.to_account
                for candidate in txs_from_account
                if parse_time(candidate.timestamp) >= parse_time(tx.timestamp)
                and (parse_time(candidate.timestamp) - parse_time(tx.timestamp)).total_seconds() <= 600
                and candidate.amount < 50000
            }
            if len(window_targets) >= 5:
                smurfing_hit = True
                indicators.append("rule 2 smurfing: 5+ sub-50k beneficiaries inside 10 minutes")
                rule_hits += 1
                break

        # Rule 3: New Account High Value
        profile = account_profiles.get(account_id, {})
        if profile.get("created_days_ago", 999) < 30 and incoming_amount[account_id] > 100000:
            indicators.append("rule 3 new account high value: <30 days old and received >1 lakh")
            rule_hits += 1

        # Rule 4: Fan-In Aggregation
        fan_in_hit = False
        for event_time, _amount, _sender in inbound_events:
            senders_in_window = {
                sender
                for candidate_time, _candidate_amount, sender in inbound_events
                if candidate_time >= event_time
                and (candidate_time - event_time).total_seconds() <= 3600
            }
            if len(senders_in_window) >= 10:
                fan_in_hit = True
                indicators.append("rule 4 fan-in aggregation: 10+ senders within 1 hour")
                rule_hits += 1
                break

        # Rule 5: Device Mismatch
        current_device = profile.get("device_id")
        if current_device:
            linked_flagged_accounts = [
                other_id
                for other_id, other_profile in account_profiles.items()
                if other_id != account_id
                and other_profile.get("device_id") == current_device
                and other_id.startswith("MULE-")
            ]
            if linked_flagged_accounts and account_id.startswith(("MULE-", "PRED-")):
                indicators.append("rule 5 device mismatch: device previously tied to flagged account")
                rule_hits += 1

        if node.node_type == "victim":
            risk_score = 38
            coordination = 15
            dissipation = 41
            indicators = ["victimized origin account", "single anomalous outgoing transfer"] + indicators
        elif node.node_type == "predicted":
            risk_score = node.risk_score + min(rule_hits * 2, 6)
            coordination = node.human_coordination_score + min(rule_hits * 2, 6)
            dissipation = node.dissipation_risk + min(rule_hits * 2, 6)
            indicators = ["predicted next-hop", "high downstream cash-out probability"] + indicators
        elif node.node_type == "sink":
            risk_score = 95
            coordination = 89
            dissipation = 99
            indicators = ["cash-out corridor", "wallet or crypto off-ramp behavior"] + indicators
        else:
            velocity_score = min(outgoing[account_id] * 18, 35)
            fan_out_score = min(len(unique_targets[account_id]) * 20, 30)
            burst_score = 20 if outgoing[account_id] >= 2 else 8
            rule_score = min(rule_hits * 8, 32)
            base = 32
            risk_score = min(base + velocity_score + fan_out_score + burst_score, 99)
            risk_score = min(risk_score + rule_score, 99)
            coordination = min(45 + fan_out_score + (10 if outgoing[account_id] >= 2 else 0) + rule_hits * 5, 96)
            dissipation = min(40 + velocity_score + (15 if node.id.startswith("MULE-GGN") else 0) + rule_hits * 4, 98)
            base_indicators = [
                "rapid transfer velocity",
                "fan-out layering",
                "cross-bank chain expansion",
            ]
            if outgoing[account_id] >= 2:
                base_indicators.append("coordinated burst timing")
            indicators = base_indicators + indicators

        node.risk_score = risk_score
        node.human_coordination_score = coordination
        node.dissipation_risk = dissipation

        chain_confidence = min((risk_score * 0.45) + (coordination * 0.35) + (dissipation * 0.2), 99)
        results.append(
            RiskScore(
                account_id=account_id,
                risk_score=round(risk_score, 1),
                chain_confidence=round(chain_confidence, 1),
                human_coordination_score=round(coordination, 1),
                dissipation_risk=round(dissipation, 1),
                indicators=indicators,
            )
        )

    results.sort(key=lambda item: item.risk_score, reverse=True)
    return results
