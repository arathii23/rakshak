# Live Guard simulation · 2026-11-20T20:02Z

Whole calls fed chunk by chunk (8 s each) through the production Live Guard code; speech recognition replaced by the scripted text, the AI calls are real. Mode: replay from cache only · cache hits 34 · new calls 0 · failures 0.
Spend ledger (all runs, upper-bound prices): ₹28.77 of ₹30 cap.

| call | kind | alert after each chunk | first alert at | final |
|---|---|---|---|---|
| L01 son calls father after landing | genuine | none → none → none → none | — | none |
| L02 bank branch appointment | genuine | none → none → none → none | — | none |
| L03 class teacher (Hindi) | genuine | none → none → none | — | none |
| L04 clinic confirms appointment | genuine | none → none → none | — | none |
| L05 bank fraud team blocks a card the customer did not use | genuine | warning → warning → warning | chunk 1 (8 s) | warning |
| L06 electricity board maintenance notice (Hindi) | genuine | none → none | — | none |
| L07 delivery partner at the door | ambiguous | none → warning → warning | chunk 2 (16 s) | warning |
| L08 aunt asks for money for repairs | ambiguous | none → none → warning | chunk 3 (24 s) | warning |
| L09 digital arrest | scam | warning → VERY LIKELY → VERY LIKELY → VERY LIKELY | chunk 1 (8 s) | VERY LIKELY |
| L10 credit card limit and a code | scam | none → warning → VERY LIKELY | chunk 2 (16 s) | VERY LIKELY |
| L11 SIM KYC (Hindi) | scam | warning → VERY LIKELY → VERY LIKELY | chunk 1 (8 s) | VERY LIKELY |
| L12 refund and call merging | scam | none → VERY LIKELY → VERY LIKELY | chunk 2 (16 s) | VERY LIKELY |
| L13 son in trouble | scam | warning → VERY LIKELY → VERY LIKELY | chunk 1 (8 s) | VERY LIKELY |

Genuine calls with any alert: 1/6. Ambiguous calls ending at "very likely": 0/2. Scam calls alerted: 5/5; reaching "very likely": 5/5; first alert on average at chunk 1.4.
