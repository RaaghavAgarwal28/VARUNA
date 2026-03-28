import torch
import json
import pickle

def print_state_dict(state_dict, indent=0):
    for key, val in state_dict.items():
        if isinstance(val, torch.Tensor):
            print(f"{'  ' * indent}  {key}: {val.shape} | dtype: {val.dtype}")
        elif isinstance(val, dict):
            print(f"{'  ' * indent}  {key}: (nested dict)")
            print_state_dict(val, indent + 1)
        else:
            print(f"{'  ' * indent}  {key}: {type(val)} = {val}")

print("=" * 50)
print("GAT ELLIPTIC MODEL")
print("=" * 50)
gat = torch.load("models/gat_elliptic.pt", map_location="cpu", weights_only=False)
if isinstance(gat, dict):
    print("Type: State Dict (weights only)")
    print_state_dict(gat)
else:
    print("Type: Full Model")
    print(gat)

print("\n" + "=" * 50)
print("GAT FINETUNED MODEL")
print("=" * 50)
gat_ft = torch.load("models/gat_finetuned.pt", map_location="cpu", weights_only=False)
if isinstance(gat_ft, dict):
    print_state_dict(gat_ft)
else:
    print(gat_ft)

print("\n" + "=" * 50)
print("LSTM TEMPORAL MODEL")
print("=" * 50)
lstm = torch.load("models/lstm_temporal.pt", map_location="cpu", weights_only=False)
if isinstance(lstm, dict):
    print_state_dict(lstm)
else:
    print(lstm)

print("\n" + "=" * 50)
print("EIF ANOMALY MODEL (pkl)")
print("=" * 50)
with open("models/eif_anomaly.pkl", "rb") as f:
    eif = pickle.load(f)
print(eif)

print("\n" + "=" * 50)
print("METRICS JSONs")
print("=" * 50)
for fname in ["gat_elliptic_metrics.json", "lstm_metrics.json",
              "transfer_validation_metrics.json", "continual_learning_metrics.json"]:
    try:
        with open(f"models/{fname}") as f:
            data = json.load(f)
            print(f"\n--- {fname} ---")
            print(json.dumps(data, indent=2))
    except FileNotFoundError:
        print(f"{fname} not found")
