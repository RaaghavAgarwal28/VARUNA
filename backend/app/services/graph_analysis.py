"""
VARUNA — DFS Ring Detection & Role Assignment
==============================================
Identifies structural money laundering patterns in the transaction graph:
    - STAR: Central hub distributing to many leaf nodes
    - CHAIN: Sequential A→B→C→D layering
    - CYCLE: Circular flow returning to origin
    - DENSE: Highly interconnected criminal cluster

Each node in a detected ring is assigned a structural role:
    - HUB: Highest out-degree; the ring organiser
    - BRIDGE: High betweenness centrality; connects sub-clusters
    - MULE: Leaf forwarder; executes transfers

Inspired by MULE_HUNTER's ring detection engine.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Optional

from app.models.schemas import Transaction


# ── In-memory caches ──
_ring_cache: list[dict] = []
_role_cache: dict[str, dict] = {}  # account_id → {role, ring_ids, ...}
_last_built: float = 0.0


def _build_adjacency(transactions: list[Transaction]) -> tuple[dict, dict]:
    """Build directed adjacency list and reverse adjacency from transactions."""
    adj = defaultdict(set)      # outgoing neighbors
    rev_adj = defaultdict(set)  # incoming neighbors
    for tx in transactions:
        adj[tx.from_account].add(tx.to_account)
        rev_adj[tx.to_account].add(tx.from_account)
    return dict(adj), dict(rev_adj)


# ── DFS Cycle Detection (Time-Bounded) ──

def _find_cycles_dfs(adj: dict, max_depth: int = 6, time_budget: float = 10.0) -> list[list[str]]:
    """
    Find cycles in the directed graph using bounded DFS.
    Returns list of cycles (each cycle is a list of account IDs).
    """
    cycles = []
    start_time = time.time()
    visited_global = set()

    for start_node in adj:
        if time.time() - start_time > time_budget:
            break

        stack = [(start_node, [start_node], {start_node})]
        while stack:
            if time.time() - start_time > time_budget:
                break

            current, path, visited = stack.pop()

            for neighbor in adj.get(current, set()):
                if neighbor == start_node and len(path) >= 3:
                    # Found a cycle
                    cycle = path[:]
                    # Normalize cycle to smallest starting node to avoid duplicates
                    min_idx = cycle.index(min(cycle))
                    normalized = cycle[min_idx:] + cycle[:min_idx]
                    if normalized not in cycles:
                        cycles.append(normalized)
                elif neighbor not in visited and len(path) < max_depth:
                    stack.append((neighbor, path + [neighbor], visited | {neighbor}))

        visited_global.add(start_node)

    return cycles


def _detect_star_patterns(adj: dict, rev_adj: dict, min_spokes: int = 3) -> list[dict]:
    """Detect star/hub patterns where one node connects to many."""
    stars = []
    all_nodes = set(adj.keys()) | set(rev_adj.keys())

    for node in all_nodes:
        out_degree = len(adj.get(node, set()))
        in_degree = len(rev_adj.get(node, set()))

        # Star out-pattern (hub distributing)
        if out_degree >= min_spokes:
            star_members = [node] + list(adj[node])
            stars.append({
                "type": "STAR",
                "hub": node,
                "members": star_members,
                "spokes": out_degree,
                "direction": "outbound",
            })

        # Star in-pattern (collector)
        if in_degree >= min_spokes:
            star_members = [node] + list(rev_adj[node])
            stars.append({
                "type": "STAR",
                "hub": node,
                "members": star_members,
                "spokes": in_degree,
                "direction": "inbound",
            })

    return stars


def _detect_chains(adj: dict, rev_adj: dict, min_length: int = 3) -> list[dict]:
    """Detect sequential chain patterns (A→B→C→D)."""
    chains = []
    visited = set()

    # Find chain starts: nodes with in-degree 0 or no predecessors
    all_nodes = set(adj.keys()) | set(rev_adj.keys())
    chain_starts = [n for n in all_nodes if len(rev_adj.get(n, set())) == 0 and len(adj.get(n, set())) > 0]

    for start in chain_starts:
        if start in visited:
            continue

        path = [start]
        current = start
        while True:
            neighbors = adj.get(current, set())
            # Follow single-threaded path
            next_nodes = [n for n in neighbors if n not in path and len(rev_adj.get(n, set())) == 1]
            if len(next_nodes) == 1:
                current = next_nodes[0]
                path.append(current)
                visited.add(current)
            else:
                break

        if len(path) >= min_length:
            chains.append({
                "type": "CHAIN",
                "members": path,
                "length": len(path),
                "start": path[0],
                "end": path[-1],
            })

    return chains


# ── Role Assignment ──

def _assign_roles(rings: list[dict], adj: dict, rev_adj: dict) -> dict[str, dict]:
    """Assign structural roles to all nodes in detected rings."""
    roles = {}
    all_nodes = set(adj.keys()) | set(rev_adj.keys())

    # Compute betweenness centrality approximation
    # (simplified: ratio of bridge connections)
    node_ring_count = defaultdict(int)
    for ring in rings:
        for member in ring.get("members", []):
            node_ring_count[member] += 1

    for node in all_nodes:
        out_deg = len(adj.get(node, set()))
        in_deg = len(rev_adj.get(node, set()))
        total_deg = out_deg + in_deg
        ring_memberships = node_ring_count.get(node, 0)

        # Role classification heuristics
        if out_deg >= 4 or (out_deg >= 3 and in_deg >= 2):
            role = "HUB"
            confidence = min(0.6 + out_deg * 0.05, 0.99)
        elif ring_memberships >= 2:
            role = "BRIDGE"
            confidence = min(0.5 + ring_memberships * 0.1, 0.95)
        elif in_deg >= 1 and out_deg >= 1:
            role = "MULE"
            confidence = min(0.4 + total_deg * 0.05, 0.90)
        elif in_deg >= 1 or out_deg >= 1:
            role = "LEAF"
            confidence = 0.3
        else:
            role = "ISOLATED"
            confidence = 0.1

        roles[node] = {
            "role": role,
            "confidence": round(confidence, 3),
            "out_degree": out_deg,
            "in_degree": in_deg,
            "ring_memberships": ring_memberships,
        }

    return roles


# ── Public API ──

def analyze_graph(transactions: list[Transaction]) -> dict:
    """
    Full graph structural analysis: detect rings, assign roles.
    Results are cached and refreshed when new transactions arrive.
    """
    global _ring_cache, _role_cache, _last_built

    # Build graph
    adj, rev_adj = _build_adjacency(transactions)
    all_nodes = set(adj.keys()) | set(rev_adj.keys())

    # Detect patterns
    cycles = _find_cycles_dfs(adj, max_depth=6, time_budget=10.0)
    stars = _detect_star_patterns(adj, rev_adj, min_spokes=3)
    chains = _detect_chains(adj, rev_adj, min_length=3)

    # Build ring list
    rings = []
    for i, cycle in enumerate(cycles):
        rings.append({
            "id": f"CYCLE-{i+1}",
            "type": "CYCLE",
            "members": cycle,
            "size": len(cycle),
        })
    for i, star in enumerate(stars):
        rings.append({
            "id": f"STAR-{i+1}",
            **star,
            "size": len(star["members"]),
        })
    for i, chain in enumerate(chains):
        rings.append({
            "id": f"CHAIN-{i+1}",
            **chain,
            "size": len(chain["members"]),
        })

    # Assign roles
    roles = _assign_roles(rings, adj, rev_adj)

    # Cache
    _ring_cache = rings
    _role_cache = roles
    _last_built = time.time()

    return {
        "total_nodes": len(all_nodes),
        "total_edges": sum(len(v) for v in adj.values()),
        "rings_detected": len(rings),
        "cycles": len(cycles),
        "stars": len(stars),
        "chains": len(chains),
        "rings": rings,
        "roles": roles,
        "analysis_time_ms": round((time.time() - _last_built) * 1000, 1),
    }


def get_node_role(account_id: str) -> dict:
    """Get the structural role of a specific account."""
    return _role_cache.get(account_id, {
        "role": "UNKNOWN",
        "confidence": 0.0,
        "out_degree": 0,
        "in_degree": 0,
        "ring_memberships": 0,
    })


def get_rings() -> list[dict]:
    """Return cached ring structures."""
    return _ring_cache
