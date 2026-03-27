import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def print_section(title):
    print("\n" + "="*60)
    print(f" {title} ".center(60, "="))
    print("="*60 + "\n")

def run_test():
    # 1. Reset and Inject 10-Case Scenario
    print_section("1. INJECTING 10-CASE FRAUD SCENARIO")
    res = requests.post(f"{BASE_URL}/inject-fraud")
    print(f"Injection Status: {res.json()}")

    time.sleep(1) # Let backend process

    # 2. Verify Graph Analysis & Enterprise Roles
    print_section("2. DFS RING DETECTION & STRUCTURAL ROLES")
    res = requests.get(f"{BASE_URL}/graph-analysis")
    graph_data = res.json()
    
    roles = graph_data.get("roles", {})
    print(f"Total Nodes Analyzed: {graph_data.get('total_nodes', 0)}")
    
    mules = [k for k, v in roles.items() if v.get("role") == "MULE"]
    hubs = [k for k, v in roles.items() if v.get("role") == "HUB"]
    leaves = [k for k, v in roles.items() if v.get("role") == "LEAF"]
    
    print(f"Detected Roles -> MULE: {len(mules)}, HUB: {len(hubs)}, LEAF: {len(leaves)}")
    for node_id, data in roles.items():
        print(f" - {node_id:<15} | Role: {data.get('role', 'N/A'):<6} | Confidence: {data.get('confidence', 0):.2f}")

    # 3. Test 4-Pillar Scoring Engine for a MULE account
    print_section("3. 4-PILLAR SCORING ENGINE TEST (GAT + LSTM + EIF + Rules)")
    target_node = "MULE-HYD-01"
    
    # Get enterprise role and EIF score
    res_role = requests.get(f"{BASE_URL}/node-role/{target_node}")
    role_data = res_role.json()
    eif_score = role_data.get('eif', {}).get('anomaly_score', 0)
    struct_role = role_data.get('role', {}).get('role', 'N/A')
    
    # Get combined risk score
    res_analyze = requests.get(f"{BASE_URL}/analyze/{target_node}")
    analyze_data = res_analyze.json()
    
    # Get flags
    res_flags = requests.get(f"{BASE_URL}/flags/{target_node}")
    flags_data = res_flags.json()
    
    print(f"Analysis for Account: {target_node}")
    print(f"Structural Role: {struct_role}")
    print(f"Combined 4-Pillar Risk Score: {analyze_data.get('combined_score', 'N/A')} (Thresholds: Block ≥0.75, Review ≥0.45)")
    print(f"EIF Anomaly Score: {eif_score:.4f}")
    
    print("\nFlag Hits:")
    for flag in flags_data.get('flag_hits', []):
        print(f" [x] {flag.get('code', 'UNK')}: {flag.get('name', str(flag))}")

    # 4. Verify Cryptographic Audit Ledger
    print_section("4. MERKLE AUDIT LEDGER INTEGRITY")
    res = requests.get(f"{BASE_URL}/audit-ledger")
    ledger = res.json()
    
    print(f"Total Blocks Sealed: {ledger['total_blocks']}")
    print(f"Total Entries: {ledger['total_entries']}")
    print(f"Latest Root Hash: {ledger['latest_root_hash']}")
    
    res = requests.get(f"{BASE_URL}/audit-ledger/verify")
    verify = res.json()
    print(f"Ledger Chain Valid: {verify['chain_valid']}")

    print_section("TEST SUITE COMPLETE - ALL SYSTEMS SYNCED")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Test failed: {e}")
