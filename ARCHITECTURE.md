# VARUNA Architecture

## Overview

VARUNA is structured as a demo-first fraud interception platform with clean service boundaries:

- `simulation/scenario layer`: emits deterministic cross-bank transaction flow
- `graph + detection layer`: builds the account-transfer network and assigns explainable risk
- `account analysis layer`: extracts 3-hop chains and combines rule, graph, and temporal signals
- `interception layer`: calculates freeze recommendations, timing, and recoverability
- `briefing layer`: packages the case into downloadable HTML and JSON artifacts
- `presentation layer`: renders the national command center and case drilldown experience

## Backend service map

### `scenario_data.py`
- Holds a deterministic fraud case that starts with a victim-origin UPI fraud
- Expands into mule layering and predicted future spread

### `detection.py`
- Computes rule-enhanced AI-inspired scores
- Signals:
  - velocity patterns
  - fan-out and layering
  - 2-hop and 3-hop spread
  - coordinated burst timing
  - pass-through
  - smurfing
  - new-account high value
  - fan-in aggregation
  - device mismatch

### `analysis.py`
- Provides account-centric analysis for the guide-style workflow
- Extracts 3-hop subgraphs and combines:
  - rule signals
  - GAT placeholder score
  - LSTM placeholder coordination score
  - intercept preview

### `ml_models.py`
- Explicit placeholders for:
  - GAT fraud scoring
  - LSTM temporal coordination scoring
  - continual learning / EWC explanation stub
- These keep the architecture aligned with the master guide even before real training code lands

### `interception.py`
- Determines which accounts should be frozen first
- Estimates freeze timing and projected recoverability
- Models a 3-minute response delay for demo contrast

### `briefing.py`
- Produces HTML and JSON enforcement artifacts
- Keeps output static and portable for judges

### `dashboard.py`
- Orchestrates the full response used by the frontend
- Central place to swap in live data or ML later

## Frontend experience map

### Pulse layer
- National overview metrics
- Threat urgency framing
- Animated event feed
- Inject-fraud control

### Sentinel layer
- Force-directed graph as the visual centerpiece
- Orange forecast rails show likely next-hop dissipation
- Risk cards explain why accounts were flagged
- Node-click investigation drilldown

### Intercept layer
- Freeze actions with projected recovery
- Delay simulation makes the business value obvious in seconds
- Alert panel lets the operator freeze a selected account

### Brief layer
- Shows the product does not stop at alerting
- Ends with an investigator-ready output artifact

## ML-ready upgrade path

The current scoring engine is intentionally explainable and hackathon-friendly. A future production track can add:

- Graph Attention Network for mule-ring topology intelligence
- LSTM or temporal transformer for transaction sequence forecasting
- Cross-bank feedback loops for continuous model calibration
- Bank-specific freeze success priors and adaptive orchestration

Because the frontend consumes summarized scores and graph state rather than raw model internals, those upgrades slot in without changing the demo UI.

## Streaming note

This repo still uses in-memory demo orchestration rather than real Kafka/Flink infrastructure. That is intentional for hackathon reliability. The ingest and analysis boundaries are now explicit enough that Kafka can replace transaction ingress and Flink can replace live rule-evaluation/graph update loops later.
