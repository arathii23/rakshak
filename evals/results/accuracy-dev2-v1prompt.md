# Accuracy: dev2 (60 cases) · tag v1prompt · 2026-11-20T19:41Z

Mode: live (cache first, then Sarvam) · cache hits 60 · new calls 60 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹6.72 of ₹30 cap · 236 calls · 157326 prompt + 28828 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## ai-v1

- Scams flagged (recall): **100.0% (28/28; 95% CI 87.9%–100.0%)**; called "very likely a scam": 78.6% (22/28; 95% CI 60.5%–89.8%)
- Genuine texts flagged (false alarms): **4.2% (1/24; 95% CI 0.7%–20.2%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 4/8; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 96.6% · F1 98.2% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 22 | 6 | 0 | 0 |
| genuine | 0 | 1 | 23 | 0 |
| ambiguous | 1 | 3 | 4 | 0 |

Missed scams (0): none
False alarms (1): E122[retelling→warning_signs]
Severe (very likely a scam on a non-scam, 1): E205

## hybrid-v1

- Scams flagged (recall): **89.3% (25/28; 95% CI 72.8%–96.3%)**; called "very likely a scam": 39.3% (11/28; 95% CI 23.6%–57.6%)
- Genuine texts flagged (false alarms): **12.5% (3/24; 95% CI 4.3%–31.0%)**; of which "very likely a scam": 2
- Ambiguous texts flagged: 6/8; "very likely a scam" on genuine or ambiguous (severe errors): **3**
- Precision 89.3% · F1 89.3% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 11 | 14 | 3 | 0 |
| genuine | 2 | 1 | 21 | 0 |
| ambiguous | 1 | 5 | 2 | 0 |

Missed scams (3): E002[small_test_payment→no_clear_signs], E021[bank_kyc→no_clear_signs], E028[scholarship→no_clear_signs]
False alarms (3): E103[advice→likely_scam], E114[ride_notice→warning_signs], E122[retelling→likely_scam]
Severe (very likely a scam on a non-scam, 3): E103, E122, E205

## hybrid-v2

- Scams flagged (recall): **100.0% (28/28; 95% CI 87.9%–100.0%)**; called "very likely a scam": 78.6% (22/28; 95% CI 60.5%–89.8%)
- Genuine texts flagged (false alarms): **4.2% (1/24; 95% CI 0.7%–20.2%)**; of which "very likely a scam": 1
- Ambiguous texts flagged: 4/8; "very likely a scam" on genuine or ambiguous (severe errors): **2**
- Precision 96.6% · F1 98.2% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 22 | 6 | 0 | 0 |
| genuine | 1 | 0 | 23 | 0 |
| ambiguous | 1 | 3 | 4 | 0 |

Missed scams (0): none
False alarms (1): E122[retelling→likely_scam]
Severe (very likely a scam on a non-scam, 2): E122, E205

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| ai-v1 | 100.0% (28/28; 95% CI 87.9%–100.0%) | 79% | 4.2% (1/24; 95% CI 0.7%–20.2%) | 1 | 96.6% | 98.2% | 0 |
| hybrid-v1 | 89.3% (25/28; 95% CI 72.8%–96.3%) | 39% | 12.5% (3/24; 95% CI 4.3%–31.0%) | 3 | 89.3% | 89.3% | 0 |
| hybrid-v2 | 100.0% (28/28; 95% CI 87.9%–100.0%) | 79% | 4.2% (1/24; 95% CI 0.7%–20.2%) | 2 | 96.6% | 98.2% | 0 |

## Recall by scam type (hybrid-v1)

| type | n | flagged | very likely |
|---|---|---|---|
| small_test_payment | 1 | 0 | 0 |
| scholarship | 1 | 0 | 0 |
| bank_kyc | 2 | 1 | 1 |
| code_no_keyword | 2 | 2 | 0 |
| job_task | 2 | 2 | 1 |
| relative_new_number | 2 | 2 | 1 |
| remote_support | 2 | 2 | 0 |
| electricity | 2 | 2 | 1 |
| qr_cashback | 1 | 1 | 1 |
| gift_parcel | 1 | 1 | 1 |
| apk_link | 1 | 1 | 0 |
| gift_cards | 1 | 1 | 0 |
| fastag | 1 | 1 | 0 |
| aadhaar_pan | 1 | 1 | 1 |
| lottery_prize | 1 | 1 | 0 |
| loan_threat | 1 | 1 | 0 |
| otp_fraud | 1 | 1 | 1 |
| sim_trai | 1 | 1 | 0 |
| courier | 1 | 1 | 1 |
| loan_fee | 1 | 1 | 1 |
| kidnap_hoax | 1 | 1 | 1 |
| call_merge | 1 | 1 | 0 |

## By language and style (hybrid-v1)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 12/13 | 3/14 |
| lang hinglish | 8/10 | 0/6 |
| lang hi | 5/5 | 0/4 |
| style caller | 21/24 | 3/21 |
| style dialogue | 2/2 | 0/1 |
| style stt | 2/2 | 0/2 |

