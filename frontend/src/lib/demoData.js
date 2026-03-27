export const demoData = {
  national_overview: {
    active_suspicious_chains: 4,
    recoverable_amount: 96000,
    funds_already_dissipated: 22000,
    banks_affected: 10,
    average_intercept_time_seconds: 81,
    threat_index: 92,
    urgency: "National coordination recommended within 90 seconds",
  },
  event_feed: [
    { id: "EVT-01", time: "10:00:05", title: "Victim push-to-mule transfer detected", amount: "INR 1.25L", severity: "critical" },
    { id: "EVT-02", time: "10:00:48", title: "Layering split across HDFC and ICICI rails", amount: "2 parallel branches", severity: "high" },
    { id: "EVT-03", time: "10:01:42", title: "Wallet/crypto off-ramp contact established", amount: "INR 22K dissipated", severity: "critical" },
    { id: "EVT-04", time: "10:02:10", title: "Predictive tracker marks likely NCR spread", amount: "2 likely next hops", severity: "medium" },
    { id: "EVT-05", time: "10:02:35", title: "Cross-bank freeze orchestration issued", amount: "3 accounts targeted", severity: "success" },
  ],
  cases: [
    {
      case_id: "CASE-VARUNA-042",
      title: "UPI Mule Chain Interception - Multi-bank Dissipation Attempt",
      threat_level: "Severe",
      suspicious_chains: 4,
      recoverable_amount: 96000,
      dissipated_amount: 22000,
      banks_affected: 10,
      average_intercept_time_seconds: 81,
      predicted_next_hops: ["PRED-NCR-88", "PRED-WALLET-04"],
      flagged_source_account: "VICTIM-A1",
      chain_confidence: 94.6,
      human_coordination_score: 88.2,
      dissipation_risk: 92.4,
    },
  ],
  graph: {
    nodes: [
      { id: "VICTIM-A1", label: "VICTIM-A1", bank: "State Bank of India", node_type: "victim", balance: -125000, risk_score: 38, human_coordination_score: 15, dissipation_risk: 41, status: "active" },
      { id: "MULE-HYD-01", label: "MULE-HYD-01", bank: "Axis Bank", node_type: "mule", balance: 7000, risk_score: 92, human_coordination_score: 85, dissipation_risk: 91, status: "active" },
      { id: "MULE-BLR-07", label: "MULE-BLR-07", bank: "HDFC Bank", node_type: "mule", balance: 9000, risk_score: 95, human_coordination_score: 90, dissipation_risk: 93, status: "frozen" },
      { id: "MULE-KOL-02", label: "MULE-KOL-02", bank: "ICICI Bank", node_type: "mule", balance: 6000, risk_score: 84, human_coordination_score: 72, dissipation_risk: 87, status: "active" },
      { id: "MULE-PUNE-11", label: "MULE-PUNE-11", bank: "Kotak Mahindra Bank", node_type: "mule", balance: 31000, risk_score: 88, human_coordination_score: 80, dissipation_risk: 86, status: "active" },
      { id: "MULE-GGN-14", label: "MULE-GGN-14", bank: "Yes Bank", node_type: "mule", balance: 7000, risk_score: 94, human_coordination_score: 88, dissipation_risk: 96, status: "frozen" },
      { id: "CRYPTO-RAMP-09", label: "CRYPTO-RAMP-09", bank: "Fintech Settlement", node_type: "sink", balance: 22000, risk_score: 95, human_coordination_score: 89, dissipation_risk: 99, status: "active" },
      { id: "MULE-CCU-55", label: "MULE-CCU-55", bank: "Punjab National Bank", node_type: "mule", balance: 19000, risk_score: 83, human_coordination_score: 76, dissipation_risk: 84, status: "active" },
      { id: "MULE-DEL-21", label: "MULE-DEL-21", bank: "Bank of Baroda", node_type: "mule", balance: 15000, risk_score: 82, human_coordination_score: 73, dissipation_risk: 88, status: "active" },
      { id: "MULE-JPR-06", label: "MULE-JPR-06", bank: "Canara Bank", node_type: "mule", balance: 9000, risk_score: 79, human_coordination_score: 69, dissipation_risk: 78, status: "active" },
      { id: "PRED-NCR-88", label: "PRED-NCR-88", bank: "IndusInd Bank", node_type: "predicted", balance: 0, risk_score: 91, human_coordination_score: 86, dissipation_risk: 88, status: "predicted" },
      { id: "PRED-WALLET-04", label: "PRED-WALLET-04", bank: "Wallet Exit Rail", node_type: "predicted", balance: 0, risk_score: 89, human_coordination_score: 80, dissipation_risk: 94, status: "predicted" }
    ],
    links: [
      { source: "VICTIM-A1", target: "MULE-HYD-01", amount: 125000, timestamp: "2026-03-27T10:00:05Z", hop: 1, status: "observed" },
      { source: "MULE-HYD-01", target: "MULE-BLR-07", amount: 90000, timestamp: "2026-03-27T10:00:31Z", hop: 1, status: "frozen" },
      { source: "MULE-HYD-01", target: "MULE-KOL-02", amount: 28000, timestamp: "2026-03-27T10:00:48Z", hop: 1, status: "observed" },
      { source: "MULE-BLR-07", target: "MULE-PUNE-11", amount: 50000, timestamp: "2026-03-27T10:01:06Z", hop: 2, status: "observed" },
      { source: "MULE-BLR-07", target: "MULE-GGN-14", amount: 31000, timestamp: "2026-03-27T10:01:18Z", hop: 2, status: "frozen" },
      { source: "MULE-KOL-02", target: "CRYPTO-RAMP-09", amount: 22000, timestamp: "2026-03-27T10:01:42Z", hop: 2, status: "observed" },
      { source: "MULE-PUNE-11", target: "MULE-CCU-55", amount: 19000, timestamp: "2026-03-27T10:01:59Z", hop: 3, status: "observed" },
      { source: "MULE-GGN-14", target: "MULE-DEL-21", amount: 15000, timestamp: "2026-03-27T10:02:10Z", hop: 3, status: "observed" },
      { source: "MULE-GGN-14", target: "MULE-JPR-06", amount: 9000, timestamp: "2026-03-27T10:02:24Z", hop: 3, status: "observed" },
      { source: "MULE-DEL-21", target: "PRED-NCR-88", amount: 13000, timestamp: "2026-03-27T10:03:05Z", hop: 4, status: "predicted" },
      { source: "MULE-CCU-55", target: "PRED-WALLET-04", amount: 17000, timestamp: "2026-03-27T10:03:11Z", hop: 4, status: "predicted" }
    ]
  },
  timeline: [
    { time: "10:00:05", title: "Fraud entry", amount: "INR 1,25,000" },
    { time: "10:00:31", title: "Hop 1 expansion", amount: "INR 90,000" },
    { time: "10:00:48", title: "Layering split", amount: "INR 28,000" },
    { time: "10:01:18", title: "3-hop burst coordination", amount: "INR 31,000" },
    { time: "10:02:35", title: "Freeze execution", amount: "INR 96,000 recoverable" }
  ],
  sentinel_scores: [
    { account_id: "CRYPTO-RAMP-09", risk_score: 95, chain_confidence: 92.2, human_coordination_score: 89, dissipation_risk: 99, indicators: ["cash-out corridor", "wallet or crypto off-ramp behavior"] },
    { account_id: "MULE-BLR-07", risk_score: 95, chain_confidence: 91.4, human_coordination_score: 90, dissipation_risk: 93, indicators: ["rapid transfer velocity", "fan-out layering", "cross-bank chain expansion", "coordinated burst timing"] },
    { account_id: "MULE-GGN-14", risk_score: 94, chain_confidence: 91, human_coordination_score: 88, dissipation_risk: 96, indicators: ["rapid transfer velocity", "fan-out layering", "cross-bank chain expansion", "coordinated burst timing"] },
    { account_id: "MULE-HYD-01", risk_score: 92, chain_confidence: 88.6, human_coordination_score: 85, dissipation_risk: 91, indicators: ["rapid transfer velocity", "fan-out layering", "cross-bank chain expansion", "coordinated burst timing"] },
    { account_id: "PRED-NCR-88", risk_score: 91, chain_confidence: 88.3, human_coordination_score: 86, dissipation_risk: 88, indicators: ["predicted next-hop", "high downstream cash-out probability"] },
    { account_id: "PRED-WALLET-04", risk_score: 89, chain_confidence: 86.1, human_coordination_score: 80, dissipation_risk: 94, indicators: ["predicted next-hop", "high downstream cash-out probability"] }
  ],
  intercept: {
    frozen_accounts: [
      { account_id: "MULE-BLR-07", bank: "HDFC Bank", amount_frozen: 9000, eta_seconds: 42, status: "executed" },
      { account_id: "MULE-GGN-14", bank: "Yes Bank", amount_frozen: 7000, eta_seconds: 67, status: "executed" },
      { account_id: "MULE-PUNE-11", bank: "Kotak Mahindra Bank", amount_frozen: 31000, eta_seconds: 95, status: "recommended" }
    ],
    projected_recoverable_amount: 96000,
    funds_already_dissipated: 22000,
    freeze_coverage_ratio: 24.5,
    simulate_3_minute_delay: {
      additional_loss: 68000,
      recoverable_after_delay: 28000,
      narrative: "A 3-minute response delay allows the chain to reach wallet and cash-out rails before bank acknowledgements complete."
    }
  },
  brief: {
    html_report_path: "/reports/demo-brief.html",
    json_report_path: "/reports/demo-brief.json"
  }
};

