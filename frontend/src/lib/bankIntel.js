const accountLocationMap = {
  "VICTIM-A1": { state: "Maharashtra", city: "Mumbai", x: 42, y: 60 },
  "MULE-HYD-01": { state: "Telangana", city: "Hyderabad", x: 48, y: 66 },
  "MULE-BLR-07": { state: "Karnataka", city: "Bengaluru", x: 43, y: 77 },
  "MULE-KOL-02": { state: "West Bengal", city: "Kolkata", x: 68, y: 57 },
  "MULE-PUNE-11": { state: "Maharashtra", city: "Pune", x: 40, y: 66 },
  "MULE-GGN-14": { state: "Haryana", city: "Gurugram", x: 44, y: 39 },
  "CRYPTO-RAMP-09": { state: "West Bengal", city: "Kolkata", x: 69, y: 55 },
  "MULE-CCU-55": { state: "West Bengal", city: "Kolkata", x: 68, y: 58 },
  "MULE-DEL-21": { state: "Delhi", city: "New Delhi", x: 45, y: 40 },
  "MULE-JPR-06": { state: "Rajasthan", city: "Jaipur", x: 38, y: 44 },
  "PRED-NCR-88": { state: "Delhi", city: "NCR", x: 46, y: 38 },
  "PRED-WALLET-04": { state: "West Bengal", city: "Kolkata", x: 70, y: 60 },
};

const bankHomeMap = {
  "State Bank of India": { state: "Maharashtra", city: "Mumbai" },
  "Axis Bank": { state: "Telangana", city: "Hyderabad" },
  "HDFC Bank": { state: "Karnataka", city: "Bengaluru" },
  "ICICI Bank": { state: "West Bengal", city: "Kolkata" },
  "Kotak Mahindra Bank": { state: "Maharashtra", city: "Pune" },
  "Yes Bank": { state: "Haryana", city: "Gurugram" },
  "Punjab National Bank": { state: "West Bengal", city: "Kolkata" },
  "Bank of Baroda": { state: "Delhi", city: "New Delhi" },
  "Canara Bank": { state: "Rajasthan", city: "Jaipur" },
  "IndusInd Bank": { state: "Delhi", city: "NCR" },
  "Wallet Exit Rail": { state: "West Bengal", city: "Kolkata" },
  "Fintech Settlement": { state: "West Bengal", city: "Kolkata" },
};

function getAccountLocation(node) {
  return (
    accountLocationMap[node.id] || {
      state: bankHomeMap[node.bank]?.state || "Unknown",
      city: bankHomeMap[node.bank]?.city || "Unknown",
      x: 50,
      y: 50,
    }
  );
}

export function buildBankIntel(graph, eventFeed = []) {
  const nodeById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  const bankMap = new Map();

  graph.nodes.forEach((node) => {
    const location = getAccountLocation(node);
    const entry = bankMap.get(node.bank) || {
      bank: node.bank,
      state: location.state,
      city: location.city,
      x: location.x,
      y: location.y,
      suspiciousAccounts: 0,
      frozenAccounts: 0,
      predictedAccounts: 0,
      totalExposure: 0,
      anomalies: new Set(),
      linkedStates: new Set(),
      threatLevel: "Elevated",
    };

    entry.suspiciousAccounts += node.node_type === "mule" || node.node_type === "predicted" ? 1 : 0;
    entry.frozenAccounts += node.status === "frozen" ? 1 : 0;
    entry.predictedAccounts += node.node_type === "predicted" ? 1 : 0;
    entry.totalExposure += Math.max(node.balance || 0, 0);
    entry.linkedStates.add(location.state);

    if (node.risk_score >= 90) entry.anomalies.add("high-risk mule activity");
    if (node.dissipation_risk >= 90) entry.anomalies.add("fast dissipation risk");
    if (node.node_type === "predicted") entry.anomalies.add("forecast next-hop exposure");
    if (node.status === "frozen") entry.anomalies.add("freeze action already triggered");

    bankMap.set(node.bank, entry);
  });

  graph.links.forEach((link) => {
    const sourceNode = nodeById[link.source];
    const targetNode = nodeById[link.target];
    if (!sourceNode || !targetNode) return;

    const sourceEntry = bankMap.get(sourceNode.bank);
    if (sourceEntry) {
      sourceEntry.totalExposure += link.amount;
      if (sourceNode.bank !== targetNode.bank) {
        sourceEntry.anomalies.add("cross-bank chain propagation");
        sourceEntry.linkedStates.add(getAccountLocation(targetNode).state);
      }
      if (link.status === "predicted") {
        sourceEntry.anomalies.add("predicted downstream spread");
      }
    }
  });

  eventFeed.forEach((event) => {
    for (const entry of bankMap.values()) {
      if (event.title.toLowerCase().includes("freeze")) {
        entry.anomalies.add("bank coordination alert");
      }
    }
  });

  const banks = Array.from(bankMap.values())
    .map((entry) => {
      let threatLevel = "Elevated";
      if (entry.frozenAccounts >= 1 || entry.predictedAccounts >= 1) threatLevel = "High";
      if (entry.totalExposure >= 90000 || entry.anomalies.has("fast dissipation risk")) threatLevel = "Severe";

      return {
        ...entry,
        threatLevel,
        anomalies: Array.from(entry.anomalies).slice(0, 4),
        linkedStates: Array.from(entry.linkedStates),
      };
    })
    .sort((a, b) => b.totalExposure - a.totalExposure);

  return {
    banks,
    states: banks.map((bank) => ({
      bank: bank.bank,
      state: bank.state,
      city: bank.city,
      x: bank.x,
      y: bank.y,
      threatLevel: bank.threatLevel,
      anomalies: bank.anomalies,
    })),
  };
}

export function buildStateIntel(bankIntel) {
  const stateMap = new Map();

  bankIntel.banks.forEach((bank) => {
    bank.linkedStates.forEach((stateName) => {
      const current = stateMap.get(stateName) || {
        state: stateName,
        banks: [],
        totalExposure: 0,
        suspiciousAccounts: 0,
        frozenAccounts: 0,
        anomalies: new Set(),
        threatLevel: "Elevated",
      };

      current.banks.push(bank.bank);
      current.totalExposure += bank.totalExposure;
      current.suspiciousAccounts += bank.suspiciousAccounts;
      current.frozenAccounts += bank.frozenAccounts;
      bank.anomalies.forEach((anomaly) => current.anomalies.add(anomaly));
      stateMap.set(stateName, current);
    });
  });

  return Array.from(stateMap.values())
    .map((entry) => {
      let threatLevel = "Elevated";
      if (entry.totalExposure >= 120000 || entry.anomalies.has("fast dissipation risk")) threatLevel = "Severe";
      else if (entry.frozenAccounts > 0 || entry.suspiciousAccounts >= 2) threatLevel = "High";

      return {
        ...entry,
        threatLevel,
        banks: Array.from(new Set(entry.banks)),
        anomalies: Array.from(entry.anomalies).slice(0, 5),
      };
    })
    .sort((a, b) => b.totalExposure - a.totalExposure);
}

