"""
VARUNA — Cross-Domain Transfer Validation
==========================================
Validates that the Elliptic-trained (and UPI-finetuned) GAT model can detect
mule patterns in the financial_transactions_mule_test.csv dataset.

This is the proof-of-concept for judges: graph fraud patterns learned from
Bitcoin transactions transfer to Indian UPI mule chains.

Usage:
    python -m ml.validate_transfer
"""
from __future__ import annotations

import os
import json
import numpy as np
import pandas as pd
import torch
from collections import defaultdict
from torch_geometric.data import Data
from sklearn.metrics import classification_report, accuracy_score, f1_score

from ml.train_gat_elliptic import VarunaGAT

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
TEST_DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "DATA", "financial_transactions_mule_test.csv"))


def build_graph_from_mule_test(csv_path: str, in_channels: int) -> Data:
    """Build a PyTorch Geometric graph from the mule test CSV."""
    print(f"  Loading {csv_path} …")
    df = pd.read_csv(csv_path)
    print(f"  Rows: {len(df)}, Columns: {df.columns.tolist()}")

    # Gather unique accounts
    accounts = set()
    for col in ["from_account", "to_account"]:
        if col in df.columns:
            accounts.update(df[col].dropna().unique())
    accounts = sorted(accounts)
    acc_to_idx = {a: i for i, a in enumerate(accounts)}

    # Build node features (heuristic features from transaction aggregates)
    n = len(accounts)
    out_count = defaultdict(int)
    in_count = defaultdict(int)
    out_amount = defaultdict(float)
    in_amount = defaultdict(float)
    unique_targets = defaultdict(set)
    unique_senders = defaultdict(set)

    for _, row in df.iterrows():
        src = row.get("from_account")
        dst = row.get("to_account")
        amt = row.get("amount", 0)
        if pd.notna(src):
            out_count[src] += 1
            out_amount[src] += amt
            if pd.notna(dst):
                unique_targets[src].add(dst)
        if pd.notna(dst):
            in_count[dst] += 1
            in_amount[dst] += amt
            if pd.notna(src):
                unique_senders[dst].add(src)

    features = []
    for acc in accounts:
        feat = [
            out_count[acc] / 100.0,
            in_count[acc] / 100.0,
            out_amount[acc] / 1000000.0,
            in_amount[acc] / 1000000.0,
            len(unique_targets[acc]) / 50.0,
            len(unique_senders[acc]) / 50.0,
            min(out_amount[acc] / max(in_amount[acc], 1), 1.0),  # washout ratio
        ]
        # Pad to in_channels
        while len(feat) < in_channels:
            feat.append(0.0)
        features.append(feat[:in_channels])

    x = torch.tensor(features, dtype=torch.float)

    # Build edges
    src_list, dst_list = [], []
    for _, row in df.iterrows():
        s = acc_to_idx.get(row.get("from_account"))
        d = acc_to_idx.get(row.get("to_account"))
        if s is not None and d is not None:
            src_list.append(s)
            dst_list.append(d)

    edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)

    # Labels: check if there's an 'is_fraud' or 'is_mule' column
    label_col = None
    for col in ["is_fraud", "is_mule", "label", "mule_flag"]:
        if col in df.columns:
            label_col = col
            break

    if label_col:
        # Map labels to accounts: if any transaction involving the account is fraud, label it
        account_labels = {a: 0 for a in accounts}
        for _, row in df.iterrows():
            if row.get(label_col, 0) == 1:
                for col in ["from_account", "to_account"]:
                    if row.get(col) in account_labels:
                        account_labels[row[col]] = 1
        y = torch.tensor([account_labels[a] for a in accounts], dtype=torch.long)
    else:
        # No labels available — use heuristic scoring
        y = torch.zeros(n, dtype=torch.long)
        for i, acc in enumerate(accounts):
            washout = out_amount[acc] / max(in_amount[acc], 1)
            n_senders = len(unique_senders[acc])
            n_targets = len(unique_targets[acc])
            if washout > 0.85 and n_senders >= 3 and out_count[acc] >= 3:
                y[i] = 1

    data = Data(x=x, edge_index=edge_index, y=y)
    print(f"  Graph: {n} nodes, {edge_index.shape[1]} edges")
    print(f"  Suspicious: {(y == 1).sum().item()}, Clean: {(y == 0).sum().item()}")
    return data, accounts


def validate():
    """Run transfer validation."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 60)
    print("VARUNA — Cross-Domain Transfer Validation")
    print("=" * 60)

    # Load fine-tuned model
    finetuned_path = os.path.join(MODEL_DIR, "gat_finetuned.pt")
    elliptic_path = os.path.join(MODEL_DIR, "gat_elliptic.pt")

    if os.path.exists(finetuned_path):
        model_path = finetuned_path
        model_name = "GAT (EWC fine-tuned)"
    elif os.path.exists(elliptic_path):
        model_path = elliptic_path
        model_name = "GAT (Elliptic only)"
    else:
        print("  ⚠ No trained model found. Run training pipeline first.")
        return

    print(f"\n[1/3] Loading {model_name} …")
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    in_channels = checkpoint["in_channels"]
    model = VarunaGAT(in_channels=in_channels).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])

    # Build graph from test data
    print(f"\n[2/3] Building graph from mule test data …")
    if not os.path.exists(TEST_DATA_PATH):
        print(f"  ⚠ Test file not found at {TEST_DATA_PATH}")
        return

    data, accounts = build_graph_from_mule_test(TEST_DATA_PATH, in_channels)
    data = data.to(device)

    # Run inference
    print(f"\n[3/3] Running inference …")
    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index)
        probs = torch.softmax(out, dim=1)
        pred = out.argmax(dim=1)

    pred_np = pred.cpu().numpy()
    true_np = data.y.cpu().numpy()
    probs_np = probs[:, 1].cpu().numpy()  # probability of illicit

    # Metrics
    print("\n" + "=" * 50)
    print("TRANSFER VALIDATION RESULTS")
    print("=" * 50)

    if true_np.sum() > 0:
        print(classification_report(true_np, pred_np, target_names=["clean", "suspicious"], zero_division=0))
        acc = accuracy_score(true_np, pred_np)
        f1 = f1_score(true_np, pred_np, pos_label=1, zero_division=0)
    else:
        acc = 0.0
        f1 = 0.0
        print("  No ground truth labels available. Showing model predictions:")

    # Top suspicious accounts
    top_suspicious = sorted(zip(accounts, probs_np.tolist()), key=lambda x: x[1], reverse=True)[:20]
    print("\nTop 20 Suspicious Accounts:")
    print(f"  {'Account':<20} {'Fraud Prob':>10}")
    print("  " + "-" * 32)
    for acc_name, prob in top_suspicious:
        flag = " ⚠" if prob > 0.7 else ""
        print(f"  {acc_name:<20} {prob:>10.4f}{flag}")

    metrics = {
        "model_used": model_name,
        "test_nodes": len(accounts),
        "test_edges": data.edge_index.shape[1],
        "predicted_suspicious": int(pred_np.sum()),
        "accuracy": float(acc),
        "f1_suspicious": float(f1),
        "top_suspicious": [{"account": a, "probability": p} for a, p in top_suspicious[:10]],
    }

    metrics_path = os.path.join(MODEL_DIR, "transfer_validation_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\n  Metrics saved to {metrics_path}")

    return metrics


if __name__ == "__main__":
    validate()
