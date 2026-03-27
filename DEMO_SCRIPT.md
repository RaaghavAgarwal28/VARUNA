# VARUNA 2-Minute Demo Script

## Opening

"This is VARUNA, a national fraud interception command center for UPI and cross-bank mule-chain attacks. Instead of showing fraud after money disappears, VARUNA detects the chain live, predicts where it will spread next, and coordinates recovery before dissipation completes."

## Act 1: National pulse

"At the top, VARUNA Pulse shows active suspicious chains, total recoverable amount, funds already dissipated, the number of affected banks, and the current intercept window. I can inject a fraud sequence live, so the demo starts from the operator’s point of action."

## Act 2: Live mule-chain detection

"Here in VARUNA Sentinel, we can see the victim-origin account on the left, then the funds splitting across mule accounts across multiple banks. I can click any node to inspect its chain, rule hits, graph model output, and temporal coordination score. Orange nodes are predicted next-hop accounts, which means VARUNA is not only seeing the current fraud path, it is forecasting where the money is likely to go next."

## Act 3: Intercept before loss

"Now VARUNA Intercept recommends or simulates freeze actions across banks. From the alert panel I can freeze the selected account, then show how much is already frozen, how long each action takes, and the projected recoverable amount. The key demo moment is this 3-minute delay simulation: if the response is delayed, recoverability drops sharply because the chain reaches cash-out rails."

## Act 4: Enforcement-ready output

"Finally, VARUNA Brief generates an investigator-ready action package in HTML and JSON. It includes the case summary, flagged source, timeline, chain narrative, account-level risk table, freeze actions, and estimated recoverable amount. So VARUNA goes from detection to action to documentation in one workflow."

## Close

"For a hackathon MVP, this is built with explainable scoring today and is architected for a future GAT plus LSTM intelligence layer. The product story is simple: detect faster, intercept earlier, recover more."
