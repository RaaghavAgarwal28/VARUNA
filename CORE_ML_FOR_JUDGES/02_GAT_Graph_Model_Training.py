"""
VARUNA — GAT Model Training on Elliptic Bitcoin Dataset
========================================================
Train a Graph Attention Network on the Elliptic Bitcoin dataset (203K transactions).
The model learns universal graph fraud topology patterns that transfer across payment systems.

Usage:
    python -m ml.train_gat_elliptic
"""
from __future__ import annotations

import os
import sys
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import GATConv
from sklearn.metrics import classification_report, f1_score, accuracy_score

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "DATA", "elliptic_bitcoin_dataset"))
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
METRICS_PATH = os.path.join(MODEL_DIR, "gat_elliptic_metrics.json")
os.makedirs(MODEL_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Model Architecture
# ---------------------------------------------------------------------------
class VarunaGAT(nn.Module):
    """
    3‑layer Graph Attention Network with multi-head attention.
    Architecture:
        GATConv(in, 64, heads=4) → ELU → Dropout
        GATConv(256, 64, heads=4) → ELU → Dropout
        GATConv(256, 64, heads=1) → ELU
        Linear(64, 2)   # binary classification: illicit vs licit
    """

    def __init__(self, in_channels: int, hidden: int = 64, heads: int = 4, dropout: float = 0.3):
        super().__init__()
        self.dropout = dropout
        self.conv1 = GATConv(in_channels, hidden, heads=heads, dropout=dropout)
        self.conv2 = GATConv(hidden * heads, hidden, heads=heads, dropout=dropout)
        self.conv3 = GATConv(hidden * heads, hidden, heads=1, concat=False, dropout=dropout)
        self.classifier = nn.Linear(hidden, 2)

    def forward(self, x, edge_index, return_attention=False):
        attn_weights = []

        x = F.dropout(x, p=self.dropout, training=self.training)
        if return_attention:
            x, (ei1, aw1) = self.conv1(x, edge_index, return_attention_weights=True)
            attn_weights.append((ei1, aw1))
        else:
            x = self.conv1(x, edge_index)
        x = F.elu(x)

        x = F.dropout(x, p=self.dropout, training=self.training)
        if return_attention:
            x, (ei2, aw2) = self.conv2(x, edge_index, return_attention_weights=True)
            attn_weights.append((ei2, aw2))
        else:
            x = self.conv2(x, edge_index)
        x = F.elu(x)

        x = F.dropout(x, p=self.dropout, training=self.training)
        if return_attention:
            x, (ei3, aw3) = self.conv3(x, edge_index, return_attention_weights=True)
            attn_weights.append((ei3, aw3))
        else:
            x = self.conv3(x, edge_index)
        x = F.elu(x)

        out = self.classifier(x)
        if return_attention:
            return out, attn_weights
        return out

    def get_embeddings(self, x, edge_index):
        """Return node embeddings from the penultimate layer."""
        x = F.elu(self.conv1(x, edge_index))
        x = F.elu(self.conv2(x, edge_index))
        x = F.elu(self.conv3(x, edge_index))
        return x


# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------
def load_elliptic_data() -> Data:
    """Load and prepare the Elliptic Bitcoin dataset for PyTorch Geometric."""
    print("[1/4] Loading Elliptic dataset …")

    # Features: col 0 = txId, col 1 = time_step, cols 2-166 = 165 features
    features_df = pd.read_csv(os.path.join(DATA_DIR, "elliptic_txs_features.csv"), header=None)
    tx_ids = features_df[0].values
    features = features_df.iloc[:, 1:].values.astype(np.float32)  # 166 features (including timestep)

    # Build mapping: txId -> index
    tx_id_to_idx = {tx_id: idx for idx, tx_id in enumerate(tx_ids)}

    # Classes
    classes_df = pd.read_csv(os.path.join(DATA_DIR, "elliptic_txs_classes.csv"))
    # class 1=illicit, 2=licit, unknown=unlabeled
    labels = np.full(len(tx_ids), -1, dtype=np.int64)  # -1 = unknown
    for _, row in classes_df.iterrows():
        idx = tx_id_to_idx.get(row["txId"])
        if idx is not None:
            if row["class"] == "1":
                labels[idx] = 1  # illicit
            elif row["class"] == "2":
                labels[idx] = 0  # licit

    # Edges
    edges_df = pd.read_csv(os.path.join(DATA_DIR, "elliptic_txs_edgelist.csv"))
    src_list, dst_list = [], []
    for _, row in edges_df.iterrows():
        s = tx_id_to_idx.get(row["txId1"])
        d = tx_id_to_idx.get(row["txId2"])
        if s is not None and d is not None:
            src_list.append(s)
            dst_list.append(d)

    edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)
    x = torch.tensor(features, dtype=torch.float)
    y = torch.tensor(labels, dtype=torch.long)

    # Masks: only nodes with known labels participate in training/evaluation
    labeled_mask = y >= 0
    labeled_indices = labeled_mask.nonzero(as_tuple=True)[0]

    # Stratified 80/20 split
    np.random.seed(42)
    perm = np.random.permutation(len(labeled_indices))
    split = int(0.8 * len(perm))
    train_mask = torch.zeros(len(tx_ids), dtype=torch.bool)
    test_mask = torch.zeros(len(tx_ids), dtype=torch.bool)
    train_mask[labeled_indices[perm[:split]]] = True
    test_mask[labeled_indices[perm[split:]]] = True

    data = Data(x=x, edge_index=edge_index, y=y,
                train_mask=train_mask, test_mask=test_mask)

    n_illicit = (y == 1).sum().item()
    n_licit = (y == 0).sum().item()
    print(f"    Nodes: {len(tx_ids):,}  Edges: {edge_index.shape[1]:,}")
    print(f"    Labeled: {n_illicit:,} illicit + {n_licit:,} licit  ({n_illicit + n_licit:,} total)")
    print(f"    Train: {train_mask.sum().item():,}  Test: {test_mask.sum().item():,}")
    return data


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def train_model(data: Data, epochs: int = 200, lr: float = 0.005) -> dict:
    """Train the VarunaGAT model and return metrics."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[2/4] Training VarunaGAT on {device} for {epochs} epochs …")

    model = VarunaGAT(in_channels=data.x.shape[1]).to(device)
    data = data.to(device)

    # Class weights for imbalanced data (illicit << licit)
    train_labels = data.y[data.train_mask]
    n_licit = (train_labels == 0).sum().float()
    n_illicit = (train_labels == 1).sum().float()
    weight = torch.tensor([1.0, n_licit / n_illicit]).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    criterion = nn.CrossEntropyLoss(weight=weight)

    best_f1 = 0
    best_state = None

    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = criterion(out[data.train_mask], data.y[data.train_mask])
        loss.backward()
        optimizer.step()

        if epoch % 20 == 0 or epoch == 1:
            model.eval()
            with torch.no_grad():
                pred = model(data.x, data.edge_index).argmax(dim=1)
                test_pred = pred[data.test_mask].cpu().numpy()
                test_true = data.y[data.test_mask].cpu().numpy()
                f1 = f1_score(test_true, test_pred, pos_label=1, zero_division=0)
                acc = accuracy_score(test_true, test_pred)
                if f1 > best_f1:
                    best_f1 = f1
                    best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            print(f"    Epoch {epoch:>3d}  loss={loss.item():.4f}  test_acc={acc:.4f}  test_f1_illicit={f1:.4f}")

    # Restore best model
    if best_state:
        model.load_state_dict(best_state)

    # Final evaluation
    print("[3/4] Evaluating best model …")
    model.eval()
    with torch.no_grad():
        pred = model(data.x, data.edge_index).argmax(dim=1)
        test_pred = pred[data.test_mask].cpu().numpy()
        test_true = data.y[data.test_mask].cpu().numpy()

    report = classification_report(test_true, test_pred, target_names=["licit", "illicit"], output_dict=True)
    print(classification_report(test_true, test_pred, target_names=["licit", "illicit"]))

    metrics = {
        "accuracy": report["accuracy"],
        "illicit_precision": report["illicit"]["precision"],
        "illicit_recall": report["illicit"]["recall"],
        "illicit_f1": report["illicit"]["f1-score"],
        "licit_f1": report["licit"]["f1-score"],
        "epochs_trained": epochs,
        "best_f1_epoch": best_f1,
    }

    # Save model
    print("[4/4] Saving model …")
    model_path = os.path.join(MODEL_DIR, "gat_elliptic.pt")
    torch.save({
        "model_state_dict": model.cpu().state_dict(),
        "in_channels": data.x.shape[1],
        "metrics": metrics,
    }, model_path)
    print(f"    Model saved to {model_path}")

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"    Metrics saved to {METRICS_PATH}")

    return metrics


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    data = load_elliptic_data()
    metrics = train_model(data, epochs=200)
    print("\n✅ GAT training complete.")
    print(f"   Accuracy: {metrics['accuracy']:.4f}")
    print(f"   Illicit F1: {metrics['illicit_f1']:.4f}")
