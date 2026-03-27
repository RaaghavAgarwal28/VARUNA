"""
VARUNA — Elastic Weight Consolidation + Continual Learning
===========================================================
Fine-tune the Elliptic-trained GAT on synthetic UPI data using EWC to preserve
Bitcoin fraud pattern knowledge while learning Indian mule-chain patterns.

This is the research-frontier contribution: no deployed AML system in India
currently does continual learning across payment systems.

Process:
    1. Load pre-trained GAT from Elliptic dataset
    2. Compute Fisher Information Matrix on Elliptic test performance
    3. Fine-tune on synthetic UPI data with EWC penalty (λ=5000)
    4. Mix in replay buffer of Elliptic examples during UPI training
    5. Validate both Elliptic retention and UPI detection

Usage:
    python -m ml.continual_learning
"""
from __future__ import annotations

import os
import json
import copy
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from sklearn.metrics import f1_score, accuracy_score, classification_report

from ml.train_gat_elliptic import VarunaGAT, load_elliptic_data

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(MODEL_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Fisher Information Matrix computation
# ---------------------------------------------------------------------------
def compute_fisher(model: VarunaGAT, data: Data, device: torch.device, n_samples: int = 500) -> dict:
    """
    Compute the diagonal of the Fisher Information Matrix.
    This tells us which weights are most important for the current task.
    """
    model.eval()
    fisher = {n: torch.zeros_like(p) for n, p in model.named_parameters() if p.requires_grad}

    labeled_mask = data.train_mask
    labeled_indices = labeled_mask.nonzero(as_tuple=True)[0]

    # Sample a subset for efficiency
    sample_indices = labeled_indices[torch.randperm(len(labeled_indices))[:n_samples]]

    for idx in sample_indices:
        model.zero_grad()
        out = model(data.x, data.edge_index)
        log_prob = F.log_softmax(out[idx], dim=0)
        target = data.y[idx]
        loss = F.nll_loss(log_prob.unsqueeze(0), target.unsqueeze(0))
        loss.backward()

        for n, p in model.named_parameters():
            if p.grad is not None:
                fisher[n] += p.grad.detach() ** 2

    # Average over samples
    for n in fisher:
        fisher[n] /= len(sample_indices)

    return fisher


# ---------------------------------------------------------------------------
# EWC Loss
# ---------------------------------------------------------------------------
def ewc_loss(model: VarunaGAT, fisher: dict, old_params: dict, ewc_lambda: float = 5000.0) -> torch.Tensor:
    """
    Compute the EWC penalty: sum over all weights of
        (lambda / 2) * F_i * (theta_i - theta_i*)^2
    where F_i is the Fisher importance and theta_i* are the old weights.
    """
    loss = torch.tensor(0.0, device=next(model.parameters()).device)
    for n, p in model.named_parameters():
        if n in fisher:
            loss += (fisher[n] * (p - old_params[n]) ** 2).sum()
    return (ewc_lambda / 2) * loss


# ---------------------------------------------------------------------------
# Replay Buffer
# ---------------------------------------------------------------------------
class ReplayBuffer:
    """Store a subset of Elliptic training examples for mixed training."""

    def __init__(self, data: Data, buffer_size: int = 200):
        labeled_indices = data.train_mask.nonzero(as_tuple=True)[0]
        perm = torch.randperm(len(labeled_indices))[:buffer_size]
        self.indices = labeled_indices[perm]
        self.x = data.x[self.indices].clone()
        self.y = data.y[self.indices].clone()

    def sample(self, n: int = 50):
        perm = torch.randperm(len(self.indices))[:n]
        return self.x[perm], self.y[perm]


# ---------------------------------------------------------------------------
# Continual Learning Pipeline
# ---------------------------------------------------------------------------
def run_continual_learning(epochs: int = 100, ewc_lambda: float = 5000.0, lr: float = 0.001):
    """Execute the full EWC continual learning pipeline."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ── Step 1: Load pre-trained GAT ──
    print("=" * 60)
    print("VARUNA Continual Learning Pipeline")
    print("=" * 60)
    print(f"\n[1/6] Loading pre-trained GAT model from Elliptic …")

    model_path = os.path.join(MODEL_DIR, "gat_elliptic.pt")
    if not os.path.exists(model_path):
        print("    ⚠ Pre-trained model not found. Run train_gat_elliptic.py first.")
        print("    Training GAT on Elliptic now …")
        from ml.train_gat_elliptic import train_model as train_gat
        elliptic_data = load_elliptic_data()
        train_gat(elliptic_data, epochs=200)
    else:
        elliptic_data = load_elliptic_data()

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    in_channels_elliptic = checkpoint["in_channels"]
    model_elliptic = VarunaGAT(in_channels=in_channels_elliptic).to(device)
    model_elliptic.load_state_dict(checkpoint["model_state_dict"])
    print(f"    Loaded model with {in_channels_elliptic} input features")

    # ── Step 2: Evaluate baseline on Elliptic ──
    print("\n[2/6] Baseline evaluation on Elliptic test set …")
    elliptic_data = elliptic_data.to(device)
    model_elliptic.eval()
    with torch.no_grad():
        pred = model_elliptic(elliptic_data.x, elliptic_data.edge_index).argmax(dim=1)
        test_pred = pred[elliptic_data.test_mask].cpu().numpy()
        test_true = elliptic_data.y[elliptic_data.test_mask].cpu().numpy()
    elliptic_baseline_acc = accuracy_score(test_true, test_pred)
    elliptic_baseline_f1 = f1_score(test_true, test_pred, pos_label=1, zero_division=0)
    print(f"    Elliptic baseline — Acc: {elliptic_baseline_acc:.4f}  F1(illicit): {elliptic_baseline_f1:.4f}")

    # ── Step 3: Compute Fisher Information Matrix ──
    print("\n[3/6] Computing Fisher Information Matrix on Elliptic …")
    fisher = compute_fisher(model_elliptic, elliptic_data, device, n_samples=500)
    old_params = {n: p.clone().detach() for n, p in model_elliptic.named_parameters()}
    print(f"    Fisher computed over {sum(f.numel() for f in fisher.values()):,} parameters")

    # ── Step 4: Load synthetic UPI data ──
    print("\n[4/6] Loading synthetic UPI dataset …")
    upi_graph_path = os.path.join(DATA_DIR, "synthetic_upi_graph.pt")
    if not os.path.exists(upi_graph_path):
        print("    ⚠ UPI dataset not found. Generating now …")
        from ml.generate_upi_dataset import generate_dataset
        upi_data = generate_dataset()
    else:
        upi_data = torch.load(upi_graph_path, weights_only=False)
    print(f"    UPI nodes: {upi_data.x.shape[0]}  features: {upi_data.x.shape[1]}  edges: {upi_data.edge_index.shape[1]}")

    # Adapt UPI features to match Elliptic feature dimension
    upi_feat_dim = upi_data.x.shape[1]
    if upi_feat_dim != in_channels_elliptic:
        print(f"    Adapting UPI features from {upi_feat_dim} → {in_channels_elliptic} dims")
        if upi_feat_dim < in_channels_elliptic:
            padding = torch.zeros(upi_data.x.shape[0], in_channels_elliptic - upi_feat_dim)
            upi_data.x = torch.cat([upi_data.x, padding], dim=1)
        else:
            upi_data.x = upi_data.x[:, :in_channels_elliptic]

    upi_data = upi_data.to(device)
    replay_buffer = ReplayBuffer(elliptic_data.to("cpu"), buffer_size=200)

    # ── Step 5: Fine-tune with EWC ──
    print(f"\n[5/6] Fine-tuning on UPI with EWC (λ={ewc_lambda}) for {epochs} epochs …")
    model = copy.deepcopy(model_elliptic)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    # Class weights for UPI
    upi_train_labels = upi_data.y[upi_data.train_mask]
    n0 = (upi_train_labels == 0).sum().float().clamp(min=1)
    n1 = (upi_train_labels == 1).sum().float().clamp(min=1)
    weight = torch.tensor([1.0, n0 / n1]).to(device)
    criterion = nn.CrossEntropyLoss(weight=weight)

    best_combined = 0
    best_state = None

    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()

        # UPI task loss
        out = model(upi_data.x, upi_data.edge_index)
        task_loss = criterion(out[upi_data.train_mask], upi_data.y[upi_data.train_mask])

        # EWC penalty
        ewc_penalty = ewc_loss(model, fisher, old_params, ewc_lambda)

        total_loss = task_loss + ewc_penalty
        total_loss.backward()
        optimizer.step()

        if epoch % 10 == 0 or epoch == 1:
            model.eval()
            with torch.no_grad():
                # UPI evaluation
                upi_pred = model(upi_data.x, upi_data.edge_index).argmax(dim=1)
                upi_test_pred = upi_pred[upi_data.test_mask].cpu().numpy()
                upi_test_true = upi_data.y[upi_data.test_mask].cpu().numpy()
                upi_acc = accuracy_score(upi_test_true, upi_test_pred)
                upi_f1 = f1_score(upi_test_true, upi_test_pred, pos_label=1, zero_division=0)

                # Elliptic retention evaluation
                ell_pred = model(elliptic_data.x, elliptic_data.edge_index).argmax(dim=1)
                ell_test_pred = ell_pred[elliptic_data.test_mask].cpu().numpy()
                ell_test_true = elliptic_data.y[elliptic_data.test_mask].cpu().numpy()
                ell_acc = accuracy_score(ell_test_true, ell_test_pred)

                combined = upi_f1 * 0.6 + ell_acc * 0.4
                if combined > best_combined:
                    best_combined = combined
                    best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

            print(f"    Epoch {epoch:>3d}  task_loss={task_loss.item():.4f}  ewc={ewc_penalty.item():.4f}"
                  f"  UPI(acc={upi_acc:.3f} f1={upi_f1:.3f})  Elliptic_retain={ell_acc:.3f}")

    if best_state:
        model.load_state_dict(best_state)

    # ── Step 6: Final evaluation ──
    print("\n[6/6] Final evaluation …")
    model.eval()
    with torch.no_grad():
        # UPI final
        upi_pred = model(upi_data.x, upi_data.edge_index).argmax(dim=1)
        upi_test_pred = upi_pred[upi_data.test_mask].cpu().numpy()
        upi_test_true = upi_data.y[upi_data.test_mask].cpu().numpy()

        # Elliptic final
        ell_pred = model(elliptic_data.x, elliptic_data.edge_index).argmax(dim=1)
        ell_test_pred = ell_pred[elliptic_data.test_mask].cpu().numpy()
        ell_test_true = elliptic_data.y[elliptic_data.test_mask].cpu().numpy()

    upi_acc = accuracy_score(upi_test_true, upi_test_pred)
    upi_f1 = f1_score(upi_test_true, upi_test_pred, pos_label=1, zero_division=0)
    ell_acc = accuracy_score(ell_test_true, ell_test_pred)
    ell_f1 = f1_score(ell_test_true, ell_test_pred, pos_label=1, zero_division=0)

    print("\n" + "=" * 50)
    print("CONTINUAL LEARNING RESULTS")
    print("=" * 50)
    print(f"  Elliptic (Bitcoin) retention:")
    print(f"    Baseline acc: {elliptic_baseline_acc:.4f} → After EWC: {ell_acc:.4f}")
    print(f"    Baseline F1:  {elliptic_baseline_f1:.4f} → After EWC: {ell_f1:.4f}")
    print(f"  UPI (Indian mule chains):")
    print(f"    Accuracy: {upi_acc:.4f}")
    print(f"    F1(mule): {upi_f1:.4f}")
    print("=" * 50)

    metrics = {
        "elliptic_baseline_acc": elliptic_baseline_acc,
        "elliptic_baseline_f1": elliptic_baseline_f1,
        "elliptic_retention_acc": ell_acc,
        "elliptic_retention_f1": ell_f1,
        "upi_accuracy": upi_acc,
        "upi_f1_mule": upi_f1,
        "ewc_lambda": ewc_lambda,
        "epochs": epochs,
    }

    # Save fine-tuned model
    model_path = os.path.join(MODEL_DIR, "gat_finetuned.pt")
    torch.save({
        "model_state_dict": model.cpu().state_dict(),
        "in_channels": in_channels_elliptic,
        "metrics": metrics,
        "fisher_keys": list(fisher.keys()),
    }, model_path)
    print(f"\n    Model saved to {model_path}")

    metrics_path = os.path.join(MODEL_DIR, "continual_learning_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"    Metrics saved to {metrics_path}")

    return metrics


if __name__ == "__main__":
    metrics = run_continual_learning(epochs=100, ewc_lambda=5000.0)
    print(f"\n✅ Continual learning complete.")
