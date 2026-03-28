import json
import random

def generate_network(num_nodes=500):
    nodes = []
    links = []
    
    banks = ["HDFC", "SBI", "ICICI", "Axis", "Yes Bank"]
    
    # Generate exactly 500 nodes
    # Let's say: 5% victims, 20% mules, 5% sinks, 70% normal (predicted)
    num_victims = int(num_nodes * 0.05)
    num_mules = int(num_nodes * 0.20)
    num_sinks = int(num_nodes * 0.05)
    num_normal = num_nodes - num_victims - num_mules - num_sinks
    
    node_types = (
        ["victim"] * num_victims +
        ["mule"] * num_mules +
        ["sink"] * num_sinks +
        ["predicted"] * num_normal
    )
    random.shuffle(node_types)
    
    # Create the nodes
    for i in range(num_nodes):
        node_id = f"ACC{str(i+1).zfill(4)}"
        ntype = node_types[i]
        
        # risk score logic
        if ntype in ["victim", "mule", "suspect", "sink"]:
            risk = random.randint(70, 99)
        else:
            risk = random.randint(5, 40)
            
        nodes.append({
            "id": node_id,
            "label": f"Account {node_id}",
            "bank": random.choice(banks),
            "node_type": ntype,
            "balance": round(random.uniform(100, 100000), 2),
            "risk_score": risk,
            "human_coordination_score": random.randint(10, 90),
            "dissipation_risk": random.randint(10, 90),
            "status": "active"
        })
    
    # Create links to form sensible structures
    # 1. Victims send to Mules (Fan-out)
    victims = [n["id"] for n in nodes if n["node_type"] == "victim"]
    mules = [n["id"] for n in nodes if n["node_type"] == "mule"]
    sinks = [n["id"] for n in nodes if n["node_type"] == "sink"]
    normals = [n["id"] for n in nodes if n["node_type"] == "predicted"]
    
    # Victim -> Mule
    for v in victims:
        targets = random.sample(mules, random.randint(1, 3))
        for t in targets:
            links.append({"source": v, "target": t})
            
    # Mule -> Mule (Layering)
    for m in mules:
        if random.random() < 0.6:  # 60% chance to send to another mule
            targets = random.sample(mules, random.randint(1, 4))
            for t in targets:
                if t != m:
                    links.append({"source": m, "target": t})
                    
        if random.random() < 0.3:  # 30% chance to send to sink
            target = random.choice(sinks)
            links.append({"source": m, "target": target})
            
        if random.random() < 0.2:  # 20% chance to send to normal account (mix)
            targets = random.sample(normals, random.randint(1, 2))
            for t in targets:
                links.append({"source": m, "target": t})
                
    # Normal -> Normal or others (Background noise)
    for n in normals:
        if random.random() < 0.15:
            targets = random.sample(normals, random.randint(1, 3))
            for t in targets:
                if t != n:
                    links.append({"source": n, "target": t})
            
    # Add random cross-links for complexity
    all_ids = [n["id"] for n in nodes]
    for _ in range(num_nodes // 2):
        s = random.choice(all_ids)
        t = random.choice(all_ids)
        if s != t:
            links.append({"source": s, "target": t})

    # Prepare data
    data = {"nodes": nodes, "links": links}
    
    # Write to file
    out_path = "ml/data/500_accounts_network.json"
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
        
    print(f"Generated {len(nodes)} nodes and {len(links)} links. Saved to {out_path}.")

if __name__ == "__main__":
    generate_network()
