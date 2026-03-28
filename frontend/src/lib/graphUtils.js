function resolveId(endpoint) {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

export function extractSubgraph(graph, accountId) {
  if (!accountId || !graph || !graph.nodes || !graph.links) return graph;
  
  const idStr = String(accountId).trim();
  if (!idStr) return graph;

  const adj = new Map();
  graph.links.forEach(link => {
    const s = resolveId(link.source);
    const t = resolveId(link.target);
    if (!adj.has(s)) adj.set(s, new Set());
    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(s).add(t);
    adj.get(t).add(s); // Undirected adjacency for full component mapping
  });

  const visitedNodes = new Set();
  const queue = [idStr];

  const nodeExists = graph.nodes.some(n => String(n.id) === idStr);
  if (!nodeExists) return { nodes: [], links: [] };

  while (queue.length > 0) {
    const curr = queue.shift();
    if (!visitedNodes.has(curr)) {
      visitedNodes.add(curr);
      const neighbors = adj.get(curr) || new Set();
      for (const nb of neighbors) {
        if (!visitedNodes.has(nb)) {
          queue.push(nb);
        }
      }
    }
  }

  const filteredNodes = graph.nodes.filter(n => visitedNodes.has(String(n.id)));
  const filteredLinks = graph.links.filter(l => 
    visitedNodes.has(resolveId(l.source)) && visitedNodes.has(resolveId(l.target))
  );

  return { nodes: filteredNodes, links: filteredLinks };
}
