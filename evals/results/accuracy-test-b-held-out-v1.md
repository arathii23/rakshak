# Accuracy: test-b (98 cases) · tag held-out-v1 · 2026-11-20T19:58Z

Mode: live (cache first, then Sarvam) · cache hits 0 · new calls 98 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹26.46 of ₹30 cap · 748 calls · 703628 prompt + 80021 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## rules-v1

- Scams flagged (recall): **61.1% (33/54; 95% CI 47.8%–73.0%)**; called "very likely a scam": 27.8% (15/54; 95% CI 17.6%–40.9%)
- Genuine texts flagged (false alarms): **6.5% (2/31; 95% CI 1.8%–20.7%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 1/13; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 94.3% · F1 74.2% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 15 | 18 | 21 | 0 |
| genuine | 0 | 2 | 29 | 0 |
| ambiguous | 0 | 1 | 12 | 0 |

## ai-v1

- Scams flagged (recall): **96.3% (52/54; 95% CI 87.5%–99.0%)**; called "very likely a scam": 83.3% (45/54; 95% CI 71.3%–91.0%)
- Genuine texts flagged (false alarms): **0.0% (0/31; 95% CI 0.0%–11.0%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 5/13; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 100.0% · F1 98.1% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 45 | 7 | 2 | 0 |
| genuine | 0 | 0 | 31 | 0 |
| ambiguous | 0 | 5 | 8 | 0 |

## hybrid-v1

- Scams flagged (recall): **90.7% (49/54; 95% CI 80.1%–96.0%)**; called "very likely a scam": 59.3% (32/54; 95% CI 46.0%–71.3%)
- Genuine texts flagged (false alarms): **6.5% (2/31; 95% CI 1.8%–20.7%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 3/13; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 96.1% · F1 93.3% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 32 | 17 | 5 | 0 |
| genuine | 0 | 2 | 29 | 0 |
| ambiguous | 0 | 3 | 10 | 0 |

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| rules-v1 | 61.1% (33/54; 95% CI 47.8%–73.0%) | 28% | 6.5% (2/31; 95% CI 1.8%–20.7%) | 0 | 94.3% | 74.2% | 0 |
| ai-v1 | 96.3% (52/54; 95% CI 87.5%–99.0%) | 83% | 0.0% (0/31; 95% CI 0.0%–11.0%) | 0 | 100.0% | 98.1% | 0 |
| hybrid-v1 | 90.7% (49/54; 95% CI 80.1%–96.0%) | 59% | 6.5% (2/31; 95% CI 1.8%–20.7%) | 0 | 96.1% | 93.3% | 0 |

## Recall by scam type (hybrid-v1)

| type | n | flagged | very likely |
|---|---|---|---|
| call_merge_or_wrong_code | 2 | 0 | 0 |
| courier_customs | 4 | 2 | 1 |
| fake_authority_bank_loan | 3 | 2 | 1 |
| digital_arrest | 4 | 4 | 3 |
| electricity_kyc | 4 | 4 | 1 |
| remote_support | 4 | 4 | 4 |
| task_job | 4 | 4 | 3 |
| investment_group | 4 | 4 | 2 |
| loan_advance_fee | 4 | 4 | 3 |
| lottery_prize | 4 | 4 | 2 |
| insurance_bonus | 4 | 4 | 2 |
| bank_card_code | 3 | 3 | 2 |
| upi_refund | 3 | 3 | 1 |
| relative_emergency | 3 | 3 | 3 |
| sim_telecom | 2 | 2 | 2 |
| apk_install | 2 | 2 | 2 |

## By language and style (hybrid-v1)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 17/18 | 1/10 |
| lang hinglish | 21/24 | 1/17 |
| lang hi | 11/12 | 0/4 |
| style caller | 31/34 | 1/19 |
| style dialogue | 9/9 | 1/5 |
| style stt | 9/11 | 0/7 |

