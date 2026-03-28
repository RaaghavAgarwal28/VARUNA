"""
VARUNA — Model Weight & Architecture Inspector

Use this script if a judge asks: "Can you open your .pt or .pkl file?" 
(Binary files cannot be opened in a normal text editor). 

This script safely loads the model and cleanly prints its internal Neural Network 
layers, parameters, and shapes to the console as proof of training.

Usage:
    python 08_Inspect_Model_Weights.py
"""

import os
import torch
import joblib

# Paths to the models inside the local folder
MODEL_DIR = os.path.join(os.path.dirname(__file__), "07_Trained_Model_Weights")

def inspect_pytorch_model(filename):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        return
        
    print(f"\n{'='*60}")
    print(f"🔍 INSPECTING PYTORCH MODEL: {filename}")
    print(f"{'='*60}")
    
    # Load the binary .pt file safely
    checkpoint = torch.load(path, map_location="cpu", weights_only=False)
    
    # Models are usually saved as state dictionaries
    if "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
        print(f"Training Epochs Completed: {checkpoint.get('epoch', 'N/A')}")
        print(f"Final Loss / Accuracy: {checkpoint.get('loss', 'N/A')} / {checkpoint.get('test_acc', 'N/A')}")
        print("\nNeural Network Architecture (Layers & Tensor Shapes):")
        print("-" * 50)
        
        total_params = 0
        for layer_name, tensor in state_dict.items():
            shape_str = " × ".join(map(str, tensor.shape))
            params = tensor.numel()
            total_params += params
            print(f"  • {layer_name:<25} | Shape: [{shape_str:<12}] | Params: {params}")
            
        print("-" * 50)
        print(f"Total Trainable Parameters: {total_params:,}\n")

def inspect_sklearn_model(filename):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        return
        
    print(f"\n{'='*60}")
    print(f"🔍 INSPECTING SCIKIT-LEARN/EIF MODEL: {filename}")
    print(f"{'='*60}")
    
    # Load the binary .pkl file
    model = joblib.load(path)
    
    print(f"Algorithm Class: {model.__class__.__name__}")
    print("Configuration Parameters:")
    for param, value in model.get_params().items():
        print(f"  • {param:<15} : {value}")
        
    if hasattr(model, "estimators_"):
        print(f"\nEnsemble Size: {len(model.estimators_)} Decision Trees inside the forest.")

if __name__ == "__main__":
    print("VARUNA JUDGEMENT MODE: BINARY INSPECTOR")
    
    # Inspect the PyTorch Models
    inspect_pytorch_model("lstm_temporal.pt")
    inspect_pytorch_model("gat_finetuned.pt")
    
    # Inspect the Scikit-learn Pickles
    inspect_sklearn_model("eif_anomaly.pkl")
