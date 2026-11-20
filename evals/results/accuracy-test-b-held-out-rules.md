# Accuracy: test-b (98 cases) · tag held-out-rules · 2026-11-20T19:53Z

Mode: replay from cache only · cache hits 0 · new calls 0 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹14.97 of ₹25 cap · 442 calls · 391116 prompt + 48027 completion tokens
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

## rules-v2

- Scams flagged (recall): **77.8% (42/54; 95% CI 65.1%–86.8%)**; called "very likely a scam": 31.5% (17/54; 95% CI 20.7%–44.7%)
- Genuine texts flagged (false alarms): **12.9% (4/31; 95% CI 5.1%–28.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 1/13; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 91.3% · F1 84.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 17 | 25 | 12 | 0 |
| genuine | 0 | 4 | 27 | 0 |
| ambiguous | 0 | 1 | 12 | 0 |

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| rules-v1 | 61.1% (33/54; 95% CI 47.8%–73.0%) | 28% | 6.5% (2/31; 95% CI 1.8%–20.7%) | 0 | 94.3% | 74.2% | 0 |
| rules-v2 | 77.8% (42/54; 95% CI 65.1%–86.8%) | 31% | 12.9% (4/31; 95% CI 5.1%–28.9%) | 0 | 91.3% | 84.0% | 0 |

## Recall by scam type (rules-v2)

| type | n | flagged | very likely |
|---|---|---|---|
| courier_customs | 4 | 1 | 1 |
| electricity_kyc | 4 | 2 | 0 |
| insurance_bonus | 4 | 2 | 1 |
| bank_card_code | 3 | 2 | 2 |
| fake_authority_bank_loan | 3 | 2 | 1 |
| digital_arrest | 4 | 3 | 2 |
| investment_group | 4 | 3 | 0 |
| lottery_prize | 4 | 3 | 0 |
| remote_support | 4 | 4 | 3 |
| task_job | 4 | 4 | 2 |
| loan_advance_fee | 4 | 4 | 0 |
| upi_refund | 3 | 3 | 2 |
| relative_emergency | 3 | 3 | 2 |
| sim_telecom | 2 | 2 | 0 |
| apk_install | 2 | 2 | 1 |
| call_merge_or_wrong_code | 2 | 2 | 0 |

## By language and style (rules-v2)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 14/18 | 1/10 |
| lang hinglish | 18/24 | 3/17 |
| lang hi | 10/12 | 0/4 |
| style caller | 28/34 | 2/19 |
| style dialogue | 6/9 | 2/5 |
| style stt | 8/11 | 0/7 |

