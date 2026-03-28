"""
VARUNA — LSTM Temporal Coordination Model
==========================================
2‑layer LSTM that reads sequences of (amount, time_delta, hop_number, is_cross_bank)
and outputs a coordination_score ∈ [0, 1].

High coordination scores indicate human-at-keyboard rapid relay behaviour
typical of mule chain operations.

Usage:
    python -m ml.train_lstm
"""
from __future__ import annotations

import os
import json
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Model Architecture
# ---------------------------------------------------------------------------
class VarunaLSTM(nn.Module):
    """
    2‑layer LSTM for temporal coordination scoring.
    Input:  sequence of (amount_norm, time_delta_norm, hop_number_norm, is_cross_bank)
    Output: coordination_score ∈ [0, 1]
    """

    def __init__(self, input_size: int = 4, hidden_size: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers=num_layers,
                            batch_first=True, dropout=dropout)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch, seq_len, 4)
        _, (h_n, _) = self.lstm(x)
        # h_n shape: (num_layers, batch, hidden) → take last layer
        out = self.fc(h_n[-1])
        return out.squeeze(-1)


# ---------------------------------------------------------------------------
# Synthetic Sequence Generator
# ---------------------------------------------------------------------------
class TemporalSequenceDataset(Dataset):
    """
    Generate synthetic temporal sequences for training.
    Fraud sequences: tight bursts (<90s intervals), consistent amounts ~₹48K
    Legit sequences: slow transfers (hours/days apart), varied amounts
    """

    def __init__(self, n_samples: int = 2000, max_seq_len: int = 10):
        self.sequences = []
        self.labels = []
        self.max_seq_len = max_seq_len

        for _ in range(n_samples // 2):
            # Fraud: tight burst pattern
            seq = self._gen_fraud_sequence()
            self.sequences.append(seq)
            self.labels.append(1.0)

            # Legit: normal transfer pattern
            seq = self._gen_legit_sequence()
            self.sequences.append(seq)
            self.labels.append(0.0)

    def _gen_fraud_sequence(self) -> torch.Tensor:
        seq_len = random.randint(3, self.max_seq_len)
        seq = []
        for hop in range(seq_len):
            amount_norm = random.uniform(0.05, 1.0)          # broad amounts to avoid learning amount as primary signal
            if hop == 0:
                time_delta = 0.5                             # Matches the 0.5 baseline used in inference
            else:
                time_delta = random.uniform(0.0, 0.4)        # tight bursts (< 180s * 0.4 = 72s)
            hop_norm = hop / self.max_seq_len
            is_cross = random.choice([0.0, 1.0, 1.0])        # mostly cross-bank
            seq.append([amount_norm, time_delta, hop_norm, is_cross])

        # Pad to max_seq_len
        while len(seq) < self.max_seq_len:
            seq.append([0.0, 0.0, 0.0, 0.0])
        return torch.tensor(seq[:self.max_seq_len], dtype=torch.float)

    def _gen_legit_sequence(self) -> torch.Tensor:
        seq_len = random.randint(2, self.max_seq_len)
        seq = []
        for hop in range(seq_len):
            amount_norm = random.uniform(0.01, 1.0)          # broad amounts
            if hop == 0:
                time_delta = 0.5                             # Initial tx baseline
            else:
                time_delta = random.uniform(0.6, 1.0)        # slow (hours/days)
            hop_norm = hop / self.max_seq_len
            is_cross = random.choice([0.0, 0.0, 1.0])        # mostly same-bank
            seq.append([amount_norm, time_delta, hop_norm, is_cross])

        while len(seq) < self.max_seq_len:
            seq.append([0.0, 0.0, 0.0, 0.0])
        return torch.tensor(seq[:self.max_seq_len], dtype=torch.float)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.labels[idx]


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def train_model(epochs: int = 100, lr: float = 0.001, n_samples: int = 4000) -> dict:
    """Train the LSTM model and return metrics."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[1/3] Generating {n_samples} temporal sequences …")

    dataset = TemporalSequenceDataset(n_samples=n_samples)
    split = int(0.8 * len(dataset))
    train_ds = torch.utils.data.Subset(dataset, range(split))
    test_ds = torch.utils.data.Subset(dataset, range(split, len(dataset)))

    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False)

    print(f"[2/3] Training VarunaLSTM on {device} for {epochs} epochs …")
    model = VarunaLSTM().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCELoss()

    best_acc = 0
    best_state = None

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0
        for seqs, labels in train_loader:
            seqs, labels = seqs.to(device), torch.tensor(labels, dtype=torch.float).to(device)
            optimizer.zero_grad()
            pred = model(seqs)
            loss = criterion(pred, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if epoch % 10 == 0 or epoch == 1:
            model.eval()
            correct = 0
            total = 0
            with torch.no_grad():
                for seqs, labels in test_loader:
                    seqs = seqs.to(device)
                    labels = torch.tensor(labels, dtype=torch.float).to(device)
                    pred = model(seqs)
                    correct += ((pred > 0.5).float() == labels).sum().item()
                    total += len(labels)
            acc = correct / total
            if acc > best_acc:
                best_acc = acc
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            print(f"    Epoch {epoch:>3d}  loss={total_loss / len(train_loader):.4f}  test_acc={acc:.4f}")

    if best_state:
        model.load_state_dict(best_state)

    # Final metrics
    model.eval()
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    with torch.no_grad():
        for seqs, labels in test_loader:
            seqs = seqs.to(device)
            labels_t = torch.tensor(labels, dtype=torch.float).to(device)
            pred = model(seqs)
            correct += ((pred > 0.5).float() == labels_t).sum().item()
            total += len(labels_t)
            all_preds.extend(pred.cpu().numpy())
            all_labels.extend(labels)

    metrics = {
        "accuracy": correct / total,
        "best_accuracy": best_acc,
        "epochs_trained": epochs,
        "n_samples": n_samples,
    }

    # Save
    print("[3/3] Saving model …")
    model_path = os.path.join(MODEL_DIR, "lstm_temporal.pt")
    torch.save({
        "model_state_dict": model.cpu().state_dict(),
        "metrics": metrics,
    }, model_path)
    print(f"    Model saved to {model_path}")

    metrics_path = os.path.join(MODEL_DIR, "lstm_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"    Metrics saved to {metrics_path}")

    return metrics


# ---------------------------------------------------------------------------
# Inference helper
# ---------------------------------------------------------------------------
def predict_coordination(model: VarunaLSTM, sequence: list[dict]) -> float:
    """
    Given a list of transaction dicts (with 'amount', 'time_delta', 'hop', 'is_cross_bank'),
    return a coordination score 0..1.
    """
    max_seq_len = 10
    features = []
    for tx in sequence[:max_seq_len]:
        features.append([
            min(tx.get("amount", 0) / 300000, 1.0),
            min(tx.get("time_delta", 3600) / 180, 1.0),
            tx.get("hop", 0) / max_seq_len,
            float(tx.get("is_cross_bank", False)),
        ])
    while len(features) < max_seq_len:
        features.append([0.0, 0.0, 0.0, 0.0])

    x = torch.tensor([features[:max_seq_len]], dtype=torch.float)
    model.eval()
    with torch.no_grad():
        score = model(x).item()
    return score


if __name__ == "__main__":
    metrics = train_model(epochs=100, n_samples=4000)
    print(f"\n✅ LSTM training complete.")
    print(f"   Accuracy: {metrics['accuracy']:.4f}")
    print(f"   Best accuracy: {metrics['best_accuracy']:.4f}")
