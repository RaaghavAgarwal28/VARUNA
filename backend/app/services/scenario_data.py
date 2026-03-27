from __future__ import annotations

from collections import Counter, defaultdict

from app.models.schemas import GraphLink, GraphNode, Transaction


def build_scenario() -> dict:
    account_profiles = {
        "VICTIM-A1": {"created_days_ago": 420, "device_id": "DEV-VIC-001"},
        "MULE-HYD-01": {"created_days_ago": 9, "device_id": "DEV-FRAUD-CORE-01"},
        "MULE-BLR-07": {"created_days_ago": 14, "device_id": "DEV-FRAUD-CORE-01"},
        "MULE-KOL-02": {"created_days_ago": 11, "device_id": "DEV-FRAUD-EDGE-02"},
        "MULE-PUNE-11": {"created_days_ago": 6, "device_id": "DEV-FRAUD-CORE-01"},
        "MULE-GGN-14": {"created_days_ago": 4, "device_id": "DEV-FRAUD-CORE-01"},
        "CRYPTO-RAMP-09": {"created_days_ago": 210, "device_id": "DEV-RAMP-09"},
        "MULE-CCU-55": {"created_days_ago": 7, "device_id": "DEV-FRAUD-EDGE-02"},
        "MULE-DEL-21": {"created_days_ago": 12, "device_id": "DEV-FRAUD-CORE-01"},
        "MULE-JPR-06": {"created_days_ago": 18, "device_id": "DEV-FRAUD-EDGE-03"},
        "PRED-NCR-88": {"created_days_ago": 5, "device_id": "DEV-FRAUD-CORE-01"},
        "PRED-WALLET-04": {"created_days_ago": 2, "device_id": "DEV-FRAUD-EDGE-04"},
    }

    transactions = [
        Transaction(
            tx_id="TX-1001",
            timestamp="2026-03-27T10:00:05Z",
            from_account="VICTIM-A1",
            to_account="MULE-HYD-01",
            amount=125000,
            bank_from="State Bank of India",
            bank_to="Axis Bank",
            channel="UPI Collect",
            status="flagged",
            is_suspicious=True,
            tx_hash="HASH-TX-1001",
        ),
        Transaction(
            tx_id="TX-1002",
            timestamp="2026-03-27T10:00:31Z",
            from_account="MULE-HYD-01",
            to_account="MULE-BLR-07",
            amount=90000,
            bank_from="Axis Bank",
            bank_to="HDFC Bank",
            channel="IMPS",
            status="flagged",
            is_suspicious=True,
            tx_hash="HASH-TX-1002",
        ),
        Transaction(
            tx_id="TX-1003",
            timestamp="2026-03-27T10:00:48Z",
            from_account="MULE-HYD-01",
            to_account="MULE-KOL-02",
            amount=28000,
            bank_from="Axis Bank",
            bank_to="ICICI Bank",
            channel="UPI",
            status="flagged",
            is_suspicious=True,
            tx_hash="HASH-TX-1003",
        ),
        Transaction(
            tx_id="TX-1004",
            timestamp="2026-03-27T10:01:06Z",
            from_account="MULE-BLR-07",
            to_account="MULE-PUNE-11",
            amount=50000,
            bank_from="HDFC Bank",
            bank_to="Kotak Mahindra Bank",
            channel="IMPS",
            status="flagged",
            is_suspicious=True,
            tx_hash="HASH-TX-1004",
        ),
        Transaction(
            tx_id="TX-1005",
            timestamp="2026-03-27T10:01:18Z",
            from_account="MULE-BLR-07",
            to_account="MULE-GGN-14",
            amount=31000,
            bank_from="HDFC Bank",
            bank_to="Yes Bank",
            channel="UPI",
            status="flagged",
            is_suspicious=True,
            tx_hash="HASH-TX-1005",
        ),
        Transaction(
            tx_id="TX-1006",
            timestamp="2026-03-27T10:01:42Z",
            from_account="MULE-KOL-02",
            to_account="CRYPTO-RAMP-09",
            amount=22000,
            bank_from="ICICI Bank",
            bank_to="Fintech Settlement",
            channel="Wallet Transfer",
            status="dissipated",
            is_suspicious=True,
            tx_hash="HASH-TX-1006",
        ),
        Transaction(
            tx_id="TX-1007",
            timestamp="2026-03-27T10:01:59Z",
            from_account="MULE-PUNE-11",
            to_account="MULE-CCU-55",
            amount=19000,
            bank_from="Kotak Mahindra Bank",
            bank_to="Punjab National Bank",
            channel="UPI",
            status="processing",
            is_suspicious=True,
            tx_hash="HASH-TX-1007",
        ),
        Transaction(
            tx_id="TX-1008",
            timestamp="2026-03-27T10:02:10Z",
            from_account="MULE-GGN-14",
            to_account="MULE-DEL-21",
            amount=15000,
            bank_from="Yes Bank",
            bank_to="Bank of Baroda",
            channel="NEFT",
            status="processing",
            is_suspicious=True,
            tx_hash="HASH-TX-1008",
        ),
        Transaction(
            tx_id="TX-1009",
            timestamp="2026-03-27T10:02:24Z",
            from_account="MULE-GGN-14",
            to_account="MULE-JPR-06",
            amount=9000,
            bank_from="Yes Bank",
            bank_to="Canara Bank",
            channel="UPI",
            status="processing",
            is_suspicious=True,
            tx_hash="HASH-TX-1009",
        ),
    ]

    balances = defaultdict(float)
    outgoing = Counter()
    incoming = Counter()
    banks = {}

    for tx in transactions:
        balances[tx.from_account] -= tx.amount
        balances[tx.to_account] += tx.amount
        outgoing[tx.from_account] += 1
        incoming[tx.to_account] += 1
        banks[tx.from_account] = tx.bank_from
        banks[tx.to_account] = tx.bank_to

    node_types = {
        "VICTIM-A1": "victim",
        "CRYPTO-RAMP-09": "sink",
        "PRED-NCR-88": "predicted",
        "PRED-WALLET-04": "predicted",
    }

    nodes = []
    for account_id, bank in banks.items():
        node_type = node_types.get(account_id, "mule")
        status = "frozen" if account_id in {"MULE-BLR-07", "MULE-GGN-14"} else "active"
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

    nodes.extend(
        [
            GraphNode(
                id="PRED-NCR-88",
                label="PRED-NCR-88",
                bank="IndusInd Bank",
                node_type="predicted",
                balance=0,
                risk_score=91,
                human_coordination_score=86,
                dissipation_risk=88,
                status="predicted",
            ),
            GraphNode(
                id="PRED-WALLET-04",
                label="PRED-WALLET-04",
                bank="Wallet Exit Rail",
                node_type="predicted",
                balance=0,
                risk_score=89,
                human_coordination_score=80,
                dissipation_risk=94,
                status="predicted",
            ),
        ]
    )

    links = [
        GraphLink(
            source=tx.from_account,
            target=tx.to_account,
            amount=tx.amount,
            timestamp=tx.timestamp,
            hop=index // 3 + 1,
            status="frozen" if tx.to_account in {"MULE-BLR-07", "MULE-GGN-14"} else "observed",
        )
        for index, tx in enumerate(transactions)
    ]
    links.extend(
        [
            GraphLink(
                source="MULE-DEL-21",
                target="PRED-NCR-88",
                amount=13000,
                timestamp="2026-03-27T10:03:05Z",
                hop=4,
                status="predicted",
            ),
            GraphLink(
                source="MULE-CCU-55",
                target="PRED-WALLET-04",
                amount=17000,
                timestamp="2026-03-27T10:03:11Z",
                hop=4,
                status="predicted",
            ),
        ]
    )

    return {
        "transactions": transactions,
        "nodes": nodes,
        "links": links,
        "account_profiles": account_profiles,
    }
