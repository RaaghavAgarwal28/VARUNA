/**
 * Bundle Layout — Cluster-based node grouping for the 3D graph.
 * Ported from MULE_HUNTER's bundleLayout.ts → plain JS for VARUNA.
 */

function resolveId(e) {
  return typeof e === "object" ? e.id : e;
}

function assignClusters(graph) {
  const clusters = new Map();
  const degree = new Map();

  graph.nodes.forEach((n) => degree.set(n.id, 0));
  graph.links.forEach((l) => {
    const s = resolveId(l.source);
    const t = resolveId(l.target);
    degree.set(s, (degree.get(s) ?? 0) + 1);
    degree.set(t, (degree.get(t) ?? 0) + 1);
  });

  // Cluster 0 = fraud, 1..3 = normal nodes bucketed by degree quartile
  const normalNodes = graph.nodes.filter((n) => !n.is_anomalous);
  const degrees = normalNodes
    .map((n) => degree.get(n.id) ?? 0)
    .sort((a, b) => a - b);
  const q1 = degrees[Math.floor(degrees.length * 0.33)] ?? 0;
  const q2 = degrees[Math.floor(degrees.length * 0.66)] ?? 0;

  graph.nodes.forEach((n) => {
    if (n.is_anomalous) {
      clusters.set(n.id, 0);
    } else {
      const d = degree.get(n.id) ?? 0;
      if (d <= q1) clusters.set(n.id, 1);
      else if (d <= q2) clusters.set(n.id, 2);
      else clusters.set(n.id, 3);
    }
  });

  return clusters;
}

function clusterCenters(numClusters, radius) {
  const centers = [];
  for (let i = 0; i < numClusters; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / numClusters);
    const phi = Math.PI * (1 + Math.sqrt(5)) * i;
    centers.push({
      x: radius * Math.sin(theta) * Math.cos(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(theta),
    });
  }
  return centers;
}

export function applyBundleLayout(graph) {
  const NUM_CLUSTERS = 4;
  const CLUSTER_RADIUS = 160;
  const NODE_SPREAD = 35;

  const clusters = assignClusters(graph);
  const centers = clusterCenters(NUM_CLUSTERS, CLUSTER_RADIUS);

  let seed = 42;
  function seededRand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  const positionedNodes = graph.nodes.map((node) => {
    const clusterId = clusters.get(node.id) ?? 0;
    const center = centers[clusterId];
    const u = seededRand() * 2 - 1;
    const theta = seededRand() * Math.PI * 2;
    const r = NODE_SPREAD * Math.cbrt(seededRand());

    return {
      ...node,
      x: center.x + r * Math.sqrt(1 - u * u) * Math.cos(theta),
      y: center.y + r * Math.sqrt(1 - u * u) * Math.sin(theta),
      z: center.z + r * u,
      fx: center.x + r * Math.sqrt(1 - u * u) * Math.cos(theta),
      fy: center.y + r * Math.sqrt(1 - u * u) * Math.sin(theta),
      fz: center.z + r * u,
    };
  });

  return { nodes: positionedNodes, links: graph.links };
}

export function removeBundleLayout(graph) {
  return {
    nodes: graph.nodes.map(({ ...n }) => {
      delete n.fx;
      delete n.fy;
      delete n.fz;
      return n;
    }),
    links: graph.links,
  };
}
