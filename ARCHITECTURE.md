# VARUNA Enterprise Architecture

This diagram illustrates the final, production-grade VARUNA fraud interception system. It integrates deep learning, structural graph analysis, zero-day anomaly detection, and cryptographic compliance to create a highly resilient National Fraud Interception Command Center.

The system is split into four primary layers: **Data Foundation, Machine Learning Core, Detection Backend, and Frontend Dashboard**.

```mermaid
flowchart TD
    %% Styling
    classDef frontend fill:#0A192F,stroke:#64FFDA,stroke-width:2px,color:#E6F1FF,rx:10,ry:10
    classDef backend fill:#112240,stroke:#F59E0B,stroke-width:2px,color:#E6F1FF,rx:10,ry:10
    classDef ml fill:#233554,stroke:#A855F7,stroke-width:2px,color:#E6F1FF,rx:10,ry:10
    classDef data fill:#020617,stroke:#38BDF8,stroke-width:2px,color:#E6F1FF,rx:10,ry:10
    classDef sec fill:#1E293B,stroke:#EF4444,stroke-width:2px,color:#E6F1FF,rx:10,ry:10
    classDef default font-family:sans-serif,font-size:14px
    
    %% Data Layer
    subgraph DataLayer["Data Sources (Foundation)"]
        D1[("Elliptic Bitcoin Dataset<br/>(203K nodes)")];
        D2[("Synthetic Indian UPI Data<br/>(Graph & Sequence)")];
    end
    class D1,D2 data

    %% ML Pipeline
    subgraph MLCore["Machine Learning Pipeline (The Brain)"]
        direction TB
        ML_GAT["VarunaGAT<br/>(Graph Attention Network)<br/>Learns fraud topology"];
        ML_EWC["EWC Continual Learning<br/>Transfers Bitcoin patterns to UPI<br/>without forgetting"];
        ML_LSTM["VarunaLSTM<br/>(Temporal Sequence)<br/>Detects rapid burst coordination"];
        ML_EIF["VarunaEIF<br/>(Extended Isolation Forest)<br/>Zero-Day Anomaly Detection (12 features)"];
        
        D1 -->|Pre-training| ML_GAT
        ML_GAT -->|Weights| ML_EWC
        D2 -->|Fine-tuning| ML_EWC
        D2 -->|Time-series| ML_LSTM
        D2 -->|Unsupervised| ML_EIF
    end
    class ML_GAT,ML_EWC,ML_LSTM,ML_EIF ml

    %% Backend Engine
    subgraph BackendEngine["Detection Engine (FastAPI Backend)"]
        BE_API["Data Ingestion API<br/>Receives live transactions"];
        BE_DFS["Structural Analysis<br/>DFS Ring Detection & Role Assignment<br/>(HUB, BRIDGE, MULE, LEAF)"];
        BE_RULES["10-Flag Rule Engine<br/>Checks RBI Mule heuristics<br/>(F1-F10)"];
        BE_INF["ML Inference Service<br/>Runs live models efficiently"];
        BE_SCORE["4-Pillar Scoring Engine<br/>GAT(35%) + LSTM(25%) + EIF(20%) + Rules(20%)<br/>with Role Multipliers (HUBx1.25)"];
        BE_AUDIT["Cryptographic Audit Ledger<br/>Merkle Tree Hashing for Evidence"];
        
        BE_API --> BE_RULES
        BE_API --> BE_DFS
        BE_API --> BE_INF
        
        %% Model passing
        ML_EWC -.->|"gat_finetuned.pt"| BE_INF
        ML_LSTM -.->|"lstm_temporal.pt"| BE_INF
        ML_EIF -.->|"eif_anomaly.pkl"| BE_INF
        
        BE_RULES --> BE_SCORE
        BE_DFS --> BE_SCORE
        BE_INF --> BE_SCORE

        BE_SCORE -->|Records BLOCK/REVIEW Decisions| BE_AUDIT
    end
    class BE_API,BE_RULES,BE_DFS,BE_INF,BE_SCORE backend
    class BE_AUDIT sec

    %% Frontend Dashboard
    subgraph FrontendApp["VARUNA Dashboard (React/Vite)"]
        UI_CMD["Command Center<br/>Overview & Threat Graph"];
        UI_SNT["Sentinel Panel<br/>Live Case Investigation & Graph Roles"];
        UI_NODE["Node Details<br/>ML Scores, EIF Anomaly, Stats"];
        UI_MET["Model Metrics<br/>Live Accuracy across all 5 pipelines"];
        
        BE_SCORE -->|"REST/WS API"| UI_CMD
        BE_SCORE --> UI_SNT
        BE_SCORE --> UI_NODE
        BE_INF -->|"Metrics API"| UI_MET
        BE_AUDIT -.->|"Verify Integrity API"| UI_CMD
    end
    class UI_CMD,UI_SNT,UI_NODE,UI_MET frontend

```

### Understanding the Flow (Enterprise Edition)

1. **Data Foundation:** We use the massive **Elliptic Bitcoin Dataset** to learn universal mathematical shapes of money laundering (graph topology). We also use **Synthetic UPI data** representing Indian mule patterns.
2. **Machine Learning Brain (4 Pillars):** 
   - **VarunaGAT** learns exactly what a fraud network "looks" like.
   - **EWC (Elastic Weight Consolidation)** carefully adapts the Bitcoin-trained GAT model to the UPI data, ensuring it remembers global fraud patterns while learning local Indian characteristics.
   - **VarunaLSTM** acts like a stopwatch, learning to spot the rapid, coordinated burst timing of human mules moving money.
   - **VarunaEIF (Isolation Forest)** acts as a safety net, using 12 expanded structural features to catch zero-day anomalies that the other supervised models have never seen before.
3. **Detection Engine (Backend):** When a transaction comes in, it splits into three analytical paths:
   - **10-Flag internal engine** checks for heuristic hits (like zero-washout or dormant spikes).
   - **Structural Analysis** uses localized DFS to find cycles/rings and assigns strategic roles (HUB, BRIDGE, MULE).
   - **ML Inference Service** passes the subgraph to GAT, LSTM, and EIF.
   Finally, the **4-Pillar Scoring Engine** calculates a combined risk score out of 100, heavily amplifying the risk if the node is assigned a central coordination role like a **HUB** or **BRIDGE**.
4. **Cryptographic Compliance:** If the scoring engine decides to `BLOCK` or flag for `REVIEW`, the data is immediately sent to the **Merkle Audit Ledger**. This creates a tamper-proof, SHA-256 hashed chain of evidence required for legal/financial compliance.
5. **VARUNA Dashboard (Frontend):** The combined intelligence is pushed to the React frontend, populating the interactive Threat Graph with new Role labels, highlighting zero-day anomalies, providing 5 distinct ML performance metric cards, and allowing real-time audit ledger verification.
