"""
VARUNA — Real ML Model Inference Service
==========================================
Replaces the placeholder heuristic scoring with actual trained GAT + LSTM models.
Loads pre-trained models and provides real inference for:
    1. GAT-based fraud probability (graph topology analysis)
    2. LSTM-based coordination scoring (temporal burst detection)
    3. Combined scoring with attention weight extraction
"""
from __future__ import annotations

import os
import json
import torch
import torch.nn.functional as F
from collections import defaultdict
from datetime import datetime

from app.models.schemas import Transaction

# ── Paths ──
ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
MODEL_DIR = os.path.join(ML_DIR, "models")


# ── Lazy-loaded model singletons ──
_gat_model = None
_lstm_model = None
_model_metrics = {}


def _load_gat():
    """Load the best available GAT model (finetuned > elliptic-only)."""
    global _gat_model, _model_metrics
    if _gat_model is not None:
        return _gat_model

    from ml.train_gat_elliptic import VarunaGAT

    finetuned = os.path.join(MODEL_DIR, "gat_finetuned.pt")
    elliptic = os.path.join(MODEL_DIR, "gat_elliptic.pt")
    model_path = finetuned if os.path.exists(finetuned) else elliptic

    if not os.path.exists(model_path):
        print("[ML] No GAT model found — using heuristic fallback")
        return None

    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    model = VarunaGAT(in_channels=checkpoint["in_channels"])
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    _gat_model = model
    _model_metrics["gat"] = checkpoint.get("metrics", {})
    print(f"[ML] Loaded GAT model from {os.path.basename(model_path)}")
    return model


def _load_lstm():
    """Load the LSTM temporal coordination model."""
    global _lstm_model, _model_metrics
    if _lstm_model is not None:
        return _lstm_model

    from ml.train_lstm import VarunaLSTM

    model_path = os.path.join(MODEL_DIR, "lstm_temporal.pt")
    if not os.path.exists(model_path):
        print("[ML] No LSTM model found — using heuristic fallback")
        return None

    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    model = VarunaLSTM()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    _lstm_model = model
    _model_metrics["lstm"] = checkpoint.get("metrics", {})
    print(f"[ML] Loaded LSTM model from lstm_temporal.pt")
    return model


def parse_time(timestamp: str) -> datetime:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


# ───────────────────── GAT Inference ─────────────────────

def gat_score(account_id: str, transactions: list[Transaction]) -> dict:
    """
    Compute GAT-based fraud probability for an account.
    Builds a local subgraph from the transaction list and runs inference.
    """
    model = _load_gat()

    # Gather accounts in the subgraph
    accounts = set()
    for tx in transactions:
        accounts.add(tx.from_account)
        accounts.add(tx.to_account)
    acc_list = sorted(accounts)
    acc_to_idx = {a: i for i, a in enumerate(acc_list)}

    if account_id not in acc_to_idx:
        return _gat_fallback(account_id, transactions)

    # Build node features (heuristic features from transactions)
    out_count = defaultdict(int)
    in_count = defaultdict(int)
    out_amount = defaultdict(float)
    in_amount = defaultdict(float)
    cross_bank = defaultdict(int)
    unique_targets = defaultdict(set)
    unique_senders = defaultdict(set)

    for tx in transactions:
        out_count[tx.from_account] += 1
        in_count[tx.to_account] += 1
        out_amount[tx.from_account] += tx.amount
        in_amount[tx.to_account] += tx.amount
        unique_targets[tx.from_account].add(tx.to_account)
        unique_senders[tx.to_account].add(tx.from_account)
        if tx.bank_from != tx.bank_to:
            cross_bank[tx.from_account] += 1
            cross_bank[tx.to_account] += 1

    n = len(acc_list)
    in_channels = 166  # match Elliptic feature dimension
    if model is not None:
        # Check actual model input size
        try:
            first_param = next(model.parameters())
            # GATConv stores weight with shape (in_channels * heads, ...)
            # We'll use the model's expected in_channels from the checkpoint
            pass
        except StopIteration:
            pass

    features = []
    for acc in acc_list:
        feat = [
            out_count[acc] / 50.0,
            in_count[acc] / 50.0,
            out_amount[acc] / 1000000.0,
            in_amount[acc] / 1000000.0,
            len(unique_targets[acc]) / 20.0,
            len(unique_senders[acc]) / 20.0,
            min(out_amount[acc] / max(in_amount[acc], 1), 1.0),
            cross_bank[acc] / 10.0,
        ]
        # Pad to expected feature dimension
        while len(feat) < in_channels:
            feat.append(0.0)
        features.append(feat[:in_channels])

    x = torch.tensor(features, dtype=torch.float)

    # Build edges
    src_list, dst_list = [], []
    for tx in transactions:
        s = acc_to_idx.get(tx.from_account)
        d = acc_to_idx.get(tx.to_account)
        if s is not None and d is not None:
            src_list.append(s)
            dst_list.append(d)

    if not src_list:
        return _gat_fallback(account_id, transactions)

    edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)

    if model is None:
        return _gat_fallback(account_id, transactions)

    # Run inference
    with torch.no_grad():
        out, attn_weights = model(x, edge_index, return_attention=True)
        probs = F.softmax(out, dim=1)
        idx = acc_to_idx[account_id]
        fraud_prob = probs[idx, 1].item()

    # Extract attention explanations
    explanations = []
    if attn_weights:
        last_attn = attn_weights[-1]  # (edge_index, attention_weights)
        ei, aw = last_attn
        # Find edges involving our account
        account_idx_t = torch.tensor(idx)
        mask_src = (ei[0] == account_idx_t)
        mask_dst = (ei[1] == account_idx_t)
        relevant = mask_src | mask_dst

        if relevant.any():
            max_attn = aw[relevant].max().item()
            mean_attn = aw[relevant].mean().item()
            explanations.append(f"max attention weight: {max_attn:.3f}")
            explanations.append(f"mean neighborhood attention: {mean_attn:.3f}")

    if fraud_prob > 0.8:
        explanations.append("GAT detects strong suspicious topology patterns")
        explanations.append("high-risk neighborhood embedding detected")
    elif fraud_prob > 0.5:
        explanations.append("moderate fraud topology similarity detected")
        explanations.append("account embedded in partially suspicious subgraph")
    else:
        explanations.append("account topology appears relatively normal")

    return {
        "model": "VarunaGAT (EWC fine-tuned)" if os.path.exists(os.path.join(MODEL_DIR, "gat_finetuned.pt")) else "VarunaGAT (Elliptic-trained)",
        "fraud_probability": round(fraud_prob, 4),
        "attention_explanation": explanations,
        "subgraph_size": n,
        "subgraph_edges": len(src_list),
    }


def _gat_fallback(account_id: str, transactions: list[Transaction]) -> dict:
    """Heuristic fallback when no trained model is available."""
    outgoing_neighbors = {tx.to_account for tx in transactions if tx.from_account == account_id}
    incoming_neighbors = {tx.from_account for tx in transactions if tx.to_account == account_id}
    cross_bank_edges = [
        tx for tx in transactions if account_id in {tx.from_account, tx.to_account} and tx.bank_from != tx.bank_to
    ]
    score = min(48 + (len(outgoing_neighbors) * 12) + (len(incoming_neighbors) * 6) + (len(cross_bank_edges) * 5), 98)
    return {
        "model": "GAT-heuristic-fallback",
        "fraud_probability": round(score / 100, 3),
        "attention_explanation": [
            "account embedded in dense transfer neighborhood",
            "cross-bank edges carry higher attention weight",
            "fan-out branches amplify suspicious topology score",
        ],
    }


# ───────────────────── LSTM Inference ─────────────────────

def lstm_temporal_score(account_id: str, transactions: list[Transaction]) -> dict:
    """
    Compute LSTM-based temporal coordination score for an account.
    Analyzes the sequence of transactions involving this account for burst patterns.
    """
    model = _load_lstm()

    txs = sorted(
        [tx for tx in transactions if tx.from_account == account_id or tx.to_account == account_id],
        key=lambda tx: parse_time(tx.timestamp),
    )

    if len(txs) < 2:
        return {
            "model": "VarunaLSTM" if model else "LSTM-heuristic-fallback",
            "coordination_score": 0.42,
            "sequence_summary": "insufficient temporal sequence, fallback baseline applied",
            "sequence_length": len(txs),
        }

    # Build sequence features
    max_seq_len = 10
    features = []
    for i, tx in enumerate(txs[:max_seq_len]):
        amount_norm = min(tx.amount / 300000, 1.0)
        if i > 0:
            time_delta = (parse_time(tx.timestamp) - parse_time(txs[i - 1].timestamp)).total_seconds()
            time_delta_norm = min(time_delta / 180, 1.0)  # normalize to 3-minute window
        else:
            time_delta_norm = 0.5
        hop_norm = i / max_seq_len
        is_cross = 1.0 if tx.bank_from != tx.bank_to else 0.0
        features.append([amount_norm, time_delta_norm, hop_norm, is_cross])

    # Pad
    while len(features) < max_seq_len:
        features.append([0.0, 0.0, 0.0, 0.0])

    if model is not None:
        x = torch.tensor([features[:max_seq_len]], dtype=torch.float)
        with torch.no_grad():
            score = model(x).item()
    else:
        # Heuristic fallback
        deltas = []
        for prev, curr in zip(txs, txs[1:]):
            deltas.append((parse_time(curr.timestamp) - parse_time(prev.timestamp)).total_seconds())
        avg_delta = sum(deltas) / len(deltas)
        burstiness = max(0, 1 - min(avg_delta / 180, 1))
        score = min(0.45 + burstiness * 0.45 + (0.08 if len(txs) >= 4 else 0), 0.97)

    # Compute sequence summary
    deltas = []
    for prev, curr in zip(txs, txs[1:]):
        deltas.append((parse_time(curr.timestamp) - parse_time(prev.timestamp)).total_seconds())
    avg_delta = sum(deltas) / len(deltas) if deltas else 0

    return {
        "model": "VarunaLSTM" if model else "LSTM-heuristic-fallback",
        "coordination_score": round(score, 4),
        "sequence_summary": f"average inter-transfer gap {round(avg_delta, 1)} seconds across {len(txs)} events",
        "sequence_length": len(txs),
        "avg_delta_seconds": round(avg_delta, 1),
    }


# ───────────────────── EIF Inference ─────────────────────

_eif_model = None
_eif_scaler = None


def _load_eif():
    """Load the Isolation Forest anomaly detection model."""
    global _eif_model, _eif_scaler, _model_metrics
    if _eif_model is not None:
        return _eif_model, _eif_scaler

    import pickle

    model_path = os.path.join(MODEL_DIR, "eif_anomaly.pkl")
    scaler_path = os.path.join(MODEL_DIR, "eif_scaler.pkl")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        print("[ML] No EIF model found — using heuristic fallback")
        return None, None

    with open(model_path, "rb") as f:
        _eif_model = pickle.load(f)
    with open(scaler_path, "rb") as f:
        _eif_scaler = pickle.load(f)

    # Load metrics
    metrics_path = os.path.join(MODEL_DIR, "eif_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            _model_metrics["eif"] = json.load(f)

    print("[ML] Loaded EIF model (Isolation Forest)")
    return _eif_model, _eif_scaler


def eif_anomaly_score(account_id: str, transactions: list[Transaction]) -> dict:
    """
    Compute EIF anomaly score for an account.
    Extracts 6 behavioral features → expands to 12 → scores via IsolationForest.
    """
    import numpy as np

    model, scaler = _load_eif()

    # Extract features from transactions
    account_txs = [tx for tx in transactions if tx.from_account == account_id or tx.to_account == account_id]
    out_txs = [tx for tx in transactions if tx.from_account == account_id]
    in_txs = [tx for tx in transactions if tx.to_account == account_id]

    tx_count = len(account_txs)
    velocity = min(tx_count / 10.0, 1.0)

    # Burst score
    if tx_count >= 2:
        amounts = [tx.amount for tx in account_txs]
        avg_amount = sum(amounts) / len(amounts)
        burst = min(avg_amount / 300000, 1.0)
    else:
        burst = 0.1

    # Unique counterparties
    counterparties = set()
    for tx in out_txs:
        counterparties.add(tx.to_account)
    for tx in in_txs:
        counterparties.add(tx.from_account)
    counterparty_norm = min(len(counterparties) / 20.0, 1.0)

    # Cross-bank ratio
    cross_bank = sum(1 for tx in account_txs if tx.bank_from != tx.bank_to)
    cross_ratio = cross_bank / max(tx_count, 1)

    # Amount entropy
    import math
    if tx_count >= 2:
        amounts = [tx.amount for tx in account_txs]
        total = sum(amounts)
        if total > 0:
            probs = [a / total for a in amounts]
            entropy = -sum(p * math.log(p + 1e-10) for p in probs)
        else:
            entropy = 0
    else:
        entropy = 1.0
    entropy_norm = min(entropy / 3.0, 1.0)

    # Time regularity
    if tx_count >= 3:
        sorted_txs = sorted(account_txs, key=lambda tx: parse_time(tx.timestamp))
        deltas = [(parse_time(sorted_txs[i+1].timestamp) - parse_time(sorted_txs[i].timestamp)).total_seconds()
                  for i in range(len(sorted_txs) - 1)]
        if deltas:
            mean_d = sum(deltas) / len(deltas)
            std_d = (sum((d - mean_d) ** 2 for d in deltas) / len(deltas)) ** 0.5
            regularity = min(std_d / 300, 1.0)
        else:
            regularity = 0.5
    else:
        regularity = 0.5

    raw_features = np.array([[velocity, burst, counterparty_norm, cross_ratio, entropy_norm, regularity]])

    # Expand features (6 → 12)
    v, b, cp, cr, ent, reg = raw_features[0]
    cross_features = np.array([[v*b, v*cp, b*cp, cr*ent, v*cr, b*reg]])
    expanded = np.hstack([raw_features, cross_features])

    if model is not None and scaler is not None:
        scaled = scaler.transform(expanded)
        raw_score = model.decision_function(scaled)[0]
        # Convert: shorter path (more negative) → higher anomaly score
        anomaly_score = 1.0 / (1.0 + np.exp(5 * raw_score))  # sigmoid inversion
        anomaly_score = round(float(anomaly_score), 4)
    else:
        # Heuristic fallback
        anomaly_score = round(min(velocity * 0.3 + burst * 0.2 + cross_ratio * 0.3 + (1 - regularity) * 0.2, 1.0), 4)

    return {
        "model": "VarunaEIF" if model else "EIF-heuristic-fallback",
        "anomaly_score": anomaly_score,
        "features": {
            "velocity": round(velocity, 4),
            "burst": round(burst, 4),
            "counterparties": round(counterparty_norm, 4),
            "cross_bank_ratio": round(cross_ratio, 4),
            "amount_entropy": round(entropy_norm, 4),
            "time_regularity": round(regularity, 4),
        },
    }


# ───────────────────── Model Metrics ─────────────────────

def get_model_metrics() -> dict:
    """Return training metrics for all loaded models."""
    _load_gat()
    _load_lstm()
    _load_eif()

    result = {
        "gat": _model_metrics.get("gat", {}),
        "lstm": _model_metrics.get("lstm", {}),
        "eif": _model_metrics.get("eif", {}),
    }

    # Load continual learning metrics if available
    cl_path = os.path.join(MODEL_DIR, "continual_learning_metrics.json")
    if os.path.exists(cl_path):
        with open(cl_path) as f:
            result["continual_learning"] = json.load(f)

    # Load transfer validation metrics if available
    tv_path = os.path.join(MODEL_DIR, "transfer_validation_metrics.json")
    if os.path.exists(tv_path):
        with open(tv_path) as f:
            result["transfer_validation"] = json.load(f)

    return result


def continual_learning_stub() -> dict:
    """Return info about the continual learning strategy."""
    cl_metrics_path = os.path.join(MODEL_DIR, "continual_learning_metrics.json")
    if os.path.exists(cl_metrics_path):
        with open(cl_metrics_path) as f:
            metrics = json.load(f)
        return {
            "strategy": "EWC (Elastic Weight Consolidation) + Replay Buffer",
            "status": "trained",
            "elliptic_retention_acc": metrics.get("elliptic_retention_acc", 0),
            "upi_f1_mule": metrics.get("upi_f1_mule", 0),
            "ewc_lambda": metrics.get("ewc_lambda", 5000),
        }
    return {
        "strategy": "EWC + replay buffer (ready to train)",
        "status": "pre-training",
        "note": "Run `python -m ml.continual_learning` to execute EWC fine-tuning pipeline.",
    }
