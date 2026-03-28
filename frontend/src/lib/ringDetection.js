/**
 * Ring Detection Engine — Ported from MULE_HUNTER
 *
 * Detects fraud ring structures (STAR, CHAIN, CYCLE, DENSE CLUSTER)
 * using time-bounded DFS (max 6 hops).
 *
 * Also assigns node roles: HUB, BRIDGE, MULE based on graph centrality.
 */

function resolveId(endpoint) {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

/**
 * Build adjacency lists from graph links
 */
function buildAdjacency(nodes, links) {
  const adj = new Map();
  const inDeg = new Map();
  const outDeg = new Map();

  nodes.forEach((n) => {
    adj.set(n.id, new Set());
    inDeg.set(n.id, 0);
    outDeg.set(n.id, 0);
  });

  links.forEach((l) => {
    const s = resolveId(l.source);
    const t = resolveId(l.target);
    if (adj.has(s)) adj.get(s).add(t);
    if (adj.has(t)) adj.get(t).add(s);
    outDeg.set(s, (outDeg.get(s) ?? 0) + 1);
    inDeg.set(t, (inDeg.get(t) ?? 0) + 1);
  });

  return { adj, inDeg, outDeg };
}

/**
 * Detect cycles using bounded DFS (max hop = 6)
 */
function detectCycles(adj, fraudNodeIds, maxHops = 6) {
  const cycles = [];
  const visited = new Set();

  for (const startId of fraudNodeIds) {
    const stack = [{ nodeId: startId, path: [startId], depth: 0 }];

    while (stack.length > 0) {
      const { nodeId, path, depth } = stack.pop();

      if (depth >= maxHops) continue;

      const neighbors = adj.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (neighbor === startId && path.length >= 3) {
          // Found a cycle
          const cycleKey = [...path].sort().join("-");
          if (!visited.has(cycleKey)) {
            visited.add(cycleKey);
            cycles.push([...path]);
          }
        } else if (!path.includes(neighbor) && fraudNodeIds.has(neighbor)) {
          stack.push({ nodeId: neighbor, path: [...path, neighbor], depth: depth + 1 });
        }
      }
    }
  }

  return cycles;
}

/**
 * Detect star patterns — one hub with 3+ leaf connections
 */
function detectStars(adj, fraudNodeIds) {
  const stars = [];

  for (const nodeId of fraudNodeIds) {
    const neighbors = adj.get(nodeId) || new Set();
    const fraudNeighbors = [...neighbors].filter((n) => fraudNodeIds.has(n));
    if (fraudNeighbors.length >= 3) {
      stars.push({ hub: nodeId, leaves: fraudNeighbors });
    }
  }

  return stars;
}

/**
 * Detect chains — sequences of fraud nodes connected linearly
 */
function detectChains(adj, fraudNodeIds, minLength = 3) {
  const chains = [];
  const visited = new Set();

  for (const startId of fraudNodeIds) {
    if (visited.has(startId)) continue;

    const chain = [startId];
    visited.add(startId);
    let current = startId;
    let found = true;

    while (found) {
      found = false;
      const neighbors = adj.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && fraudNodeIds.has(neighbor)) {
          const nNeighbors = adj.get(neighbor) || new Set();
          const fraudConnections = [...nNeighbors].filter((n) => fraudNodeIds.has(n));
          if (fraudConnections.length <= 2) {
            chain.push(neighbor);
            visited.add(neighbor);
            current = neighbor;
            found = true;
            break;
          }
        }
      }
    }

    if (chain.length >= minLength) {
      chains.push(chain);
    }
  }

  return chains;
}

/**
 * Detect dense clusters — groups of highly interconnected fraud nodes
 */
function detectDenseClusters(adj, fraudNodeIds, minSize = 4) {
  const clusters = [];
  const visited = new Set();

  for (const startId of fraudNodeIds) {
    if (visited.has(startId)) continue;

    // BFS to find connected component
    const component = [];
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const nodeId = queue.shift();
      component.push(nodeId);
      const neighbors = adj.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && fraudNodeIds.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (component.length >= minSize) {
      // Check density
      let edgeCount = 0;
      const compSet = new Set(component);
      for (const nodeId of component) {
        const neighbors = adj.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
          if (compSet.has(neighbor)) edgeCount++;
        }
      }
      edgeCount /= 2; // undirected
      const maxEdges = (component.length * (component.length - 1)) / 2;
      const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

      if (density > 0.3) {
        clusters.push({ nodes: component, density });
      }
    }
  }

  return clusters;
}

/**
 * Assign roles to nodes based on network position
 * HUB — highest out-degree, ring organiser
 * BRIDGE — high betweenness, connects sub-clusters
 * MULE — leaf forwarder, low betweenness
 */
function assignRoles(adj, outDeg, fraudNodeIds) {
  const roles = new Map();

  // Compute simple betweenness approximation
  const betweenness = new Map();
  for (const id of fraudNodeIds) {
    betweenness.set(id, 0);
  }

  // Simple heuristic: nodes connecting two different subgraphs get higher betweenness
  for (const id of fraudNodeIds) {
    const neighbors = adj.get(id) || new Set();
    const fraudNeighbors = [...neighbors].filter((n) => fraudNodeIds.has(n));
    const out = outDeg.get(id) || 0;

    if (out >= 4 || fraudNeighbors.length >= 4) {
      roles.set(id, "HUB");
    } else if (fraudNeighbors.length >= 2 && out >= 2) {
      roles.set(id, "BRIDGE");
    } else {
      roles.set(id, "MULE");
    }
  }

  return roles;
}

/**
 * Main ring detection function
 * Returns detected rings, roles, and statistics
 */
export function detectRings(graph) {
  if (!graph || !graph.nodes || !graph.links) {
    return { rings: [], roles: new Map(), stats: {} };
  }

  const { adj, inDeg, outDeg } = buildAdjacency(graph.nodes, graph.links);

  // Determine fraud nodes
  const fraudNodeTypes = new Set(["victim", "mule", "suspect", "sink"]);
  const fraudNodeIds = new Set(
    graph.nodes.filter((n) => fraudNodeTypes.has(n.node_type)).map((n) => n.id)
  );

  // Detect patterns
  const cycles = detectCycles(adj, fraudNodeIds);
  const stars = detectStars(adj, fraudNodeIds);
  const chains = detectChains(adj, fraudNodeIds);
  const denseClusters = detectDenseClusters(adj, fraudNodeIds);

  // Build unified rings list
  const rings = [];

  cycles.forEach((cycle, i) => {
    rings.push({
      id: `cycle-${i}`,
      type: "CYCLE",
      label: `Cycle Ring #${i + 1}`,
      nodes: cycle,
      size: cycle.length,
      icon: "🔄",
    });
  });

  stars.forEach((star, i) => {
    rings.push({
      id: `star-${i}`,
      type: "STAR",
      label: `Star Ring #${i + 1}`,
      nodes: [star.hub, ...star.leaves],
      hub: star.hub,
      size: star.leaves.length + 1,
      icon: "⭐",
    });
  });

  chains.forEach((chain, i) => {
    rings.push({
      id: `chain-${i}`,
      type: "CHAIN",
      label: `Chain #${i + 1}`,
      nodes: chain,
      size: chain.length,
      icon: "🔗",
    });
  });

  denseClusters.forEach((cluster, i) => {
    rings.push({
      id: `dense-${i}`,
      type: "DENSE",
      label: `Dense Cluster #${i + 1}`,
      nodes: cluster.nodes,
      density: cluster.density,
      size: cluster.nodes.length,
      icon: "🕸️",
    });
  });

  // Assign roles
  const roles = assignRoles(adj, outDeg, fraudNodeIds);

  const stats = {
    totalNodes: graph.nodes.length,
    fraudNodes: fraudNodeIds.size,
    totalLinks: graph.links.length,
    ringsDetected: rings.length,
    cyclesFound: cycles.length,
    starsFound: stars.length,
    chainsFound: chains.length,
    denseClustersFound: denseClusters.length,
  };

  return { rings, roles, stats };
}

/**
 * Get ring-member nodes for a specific ring
 */
export function getRingSubgraph(graph, ringNodeIds) {
  const idSet = new Set(ringNodeIds);
  return {
    nodes: graph.nodes.filter((n) => idSet.has(n.id)),
    links: graph.links.filter((l) => {
      const s = resolveId(l.source);
      const t = resolveId(l.target);
      return idSet.has(s) && idSet.has(t);
    }),
  };
}
