"""
VARUNA — Extended Isolation Forest (EIF) Training
===================================================
Trains a scikit-learn IsolationForest on tabular transaction behaviour features.
This model catches "zero-day" behavioural anomalies that the GNN hasn't learned.

Features (6 raw → 12 expanded via cross-products):
    Raw:
        velocity_score       — txCount / 10 (capped at 1.0)
        burst_score          — avg amount-to-time ratio
        unique_counterparties — number of unique accounts
        cross_bank_ratio     — fraction of cross-bank txs
        amount_entropy       — Shannon entropy of amounts
        time_regularity      — std deviation of inter-tx intervals

    Cross-products:
        velocity_burst, velocity_counterparties, burst_counterparties,
        cross_amount, velocity_cross, burst_regularity

Scoring: shorter isolation path → more anomalous → higher fraud score
"""
from __future__ import annotations

import os
import json
import pickle
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def generate_training_data(n_normal: int = 4000, n_anomalous: int = 200) -> np.ndarray:
    """Generate synthetic training data for the Isolation Forest."""
    rng = np.random.default_rng(42)

    # Normal patterns: low velocity, regular timing, few counterparties
    normal = np.column_stack([
        rng.uniform(0.01, 0.3, n_normal),    # velocity_score
        rng.uniform(0.01, 0.25, n_normal),    # burst_score
        rng.integers(1, 8, n_normal) / 20.0,  # unique_counterparties (normalized)
        rng.uniform(0.0, 0.3, n_normal),       # cross_bank_ratio
        rng.uniform(0.5, 2.5, n_normal),       # amount_entropy
        rng.uniform(0.3, 1.0, n_normal),       # time_regularity
    ])

    # Anomalous patterns: high velocity, burst amounts, many counterparties
    anomalous = np.column_stack([
        rng.uniform(0.6, 1.0, n_anomalous),    # velocity_score
        rng.uniform(0.5, 1.0, n_anomalous),     # burst_score
        rng.integers(8, 25, n_anomalous) / 20.0, # unique_counterparties
        rng.uniform(0.6, 1.0, n_anomalous),      # cross_bank_ratio
        rng.uniform(0.1, 0.8, n_anomalous),       # amount_entropy (low = repeated amounts)
        rng.uniform(0.0, 0.2, n_anomalous),        # time_regularity (low = bot-like regular timing)
    ])

    # Combine for unsupervised training (IsolationForest is unsupervised)
    data = np.vstack([normal, anomalous])
    return data


def expand_features(X: np.ndarray) -> np.ndarray:
    """Expand 6 raw features to 12 via cross-products."""
    velocity = X[:, 0]
    burst = X[:, 1]
    counterparties = X[:, 2]
    cross_bank = X[:, 3]
    entropy = X[:, 4]
    regularity = X[:, 5]

    cross_features = np.column_stack([
        velocity * burst,               # velocity_burst
        velocity * counterparties,      # velocity_counterparties
        burst * counterparties,         # burst_counterparties
        cross_bank * entropy,           # cross_amount
        velocity * cross_bank,          # velocity_cross
        burst * regularity,             # burst_regularity
    ])

    return np.hstack([X, cross_features])


def train():
    """Train the Isolation Forest and save artifacts."""
    print("=" * 60)
    print("VARUNA — Extended Isolation Forest Training")
    print("=" * 60)

    # Generate training data
    raw_data = generate_training_data(n_normal=4000, n_anomalous=200)
    expanded_data = expand_features(raw_data)

    print(f"Training data shape: {expanded_data.shape}")
    print(f"  Raw features: 6 → Expanded features: {expanded_data.shape[1]}")

    # Fit scaler
    scaler = RobustScaler()
    scaled_data = scaler.fit_transform(expanded_data)

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=200,
        max_samples=0.8,
        contamination=0.05,  # ~5% expected anomaly rate
        max_features=1.0,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(scaled_data)

    # Evaluate on training data
    raw_scores = model.decision_function(scaled_data)
    predictions = model.predict(scaled_data)

    n_anomalies = (predictions == -1).sum()
    threshold = np.percentile(raw_scores, 5)

    print(f"\nTraining Results:")
    print(f"  Anomalies detected: {n_anomalies} / {len(scaled_data)} ({n_anomalies/len(scaled_data)*100:.1f}%)")
    print(f"  Score range: [{raw_scores.min():.4f}, {raw_scores.max():.4f}]")
    print(f"  5th percentile threshold: {threshold:.4f}")

    # Save model, scaler, and metadata
    model_path = os.path.join(MODEL_DIR, "eif_anomaly.pkl")
    scaler_path = os.path.join(MODEL_DIR, "eif_scaler.pkl")
    metrics_path = os.path.join(MODEL_DIR, "eif_metrics.json")

    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)

    metrics = {
        "model": "IsolationForest",
        "n_estimators": 200,
        "contamination": 0.05,
        "n_features_raw": 6,
        "n_features_expanded": 12,
        "training_samples": len(scaled_data),
        "anomalies_detected": int(n_anomalies),
        "anomaly_rate": round(n_anomalies / len(scaled_data), 4),
        "score_threshold_5pct": round(float(threshold), 4),
        "feature_names": [
            "velocity_score", "burst_score", "unique_counterparties",
            "cross_bank_ratio", "amount_entropy", "time_regularity",
            "velocity_burst", "velocity_counterparties", "burst_counterparties",
            "cross_amount", "velocity_cross", "burst_regularity",
        ],
    }
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n✅ Model saved: {model_path}")
    print(f"✅ Scaler saved: {scaler_path}")
    print(f"✅ Metrics saved: {metrics_path}")
    print("=" * 60)

    return metrics


if __name__ == "__main__":
    train()
