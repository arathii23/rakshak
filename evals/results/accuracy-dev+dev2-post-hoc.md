# Accuracy: dev,dev2 (206 cases) · tag post-hoc · 2026-11-20T19:57Z

Mode: replay from cache only · cache hits 206 · new calls 0 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹23.54 of ₹25 cap · 650 calls · 630717 prompt + 69290 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## hybrid-v2

- Scams flagged (recall): **100.0% (100/100; 95% CI 96.3%–100.0%)**; called "very likely a scam": 89.0% (89/100; 95% CI 81.4%–93.7%)
- Genuine texts flagged (false alarms): **1.3% (1/78; 95% CI 0.2%–6.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 13/28; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 99.0% · F1 99.5% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 89 | 11 | 0 | 0 |
| genuine | 0 | 1 | 77 | 0 |
| ambiguous | 0 | 13 | 15 | 0 |

Missed scams (0): none
False alarms (1): E121[bank_branch→warning_signs]
Severe (very likely a scam on a non-scam, 0): none

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| hybrid-v2 | 100.0% (100/100; 95% CI 96.3%–100.0%) | 89% | 1.3% (1/78; 95% CI 0.2%–6.9%) | 0 | 99.0% | 99.5% | 0 |

## Recall by scam type (hybrid-v2)

| type | n | flagged | very likely |
|---|---|---|---|
| bank_kyc | 8 | 8 | 6 |
| job_task | 7 | 7 | 7 |
| digital_arrest | 6 | 6 | 6 |
| electricity | 6 | 6 | 3 |
| remote_support | 6 | 6 | 6 |
| courier | 5 | 5 | 5 |
| otp_fraud | 5 | 5 | 5 |
| upi_refund | 5 | 5 | 5 |
| apk_link | 5 | 5 | 5 |
| sim_trai | 4 | 4 | 4 |
| investment | 4 | 4 | 4 |
| loan_fee | 4 | 4 | 3 |
| lottery_prize | 4 | 4 | 4 |
| relative_emergency | 4 | 4 | 4 |
| call_merge | 3 | 3 | 1 |
| insurance | 3 | 3 | 3 |
| aadhaar_pan | 3 | 3 | 3 |
| soft_bank | 3 | 3 | 2 |
| fake_support | 2 | 2 | 2 |
| code_no_keyword | 2 | 2 | 1 |
| relative_new_number | 2 | 2 | 2 |
| soft_job | 1 | 1 | 1 |
| small_test_payment | 1 | 1 | 1 |
| qr_cashback | 1 | 1 | 1 |
| gift_parcel | 1 | 1 | 1 |
| gift_cards | 1 | 1 | 1 |
| fastag | 1 | 1 | 0 |
| loan_threat | 1 | 1 | 1 |
| kidnap_hoax | 1 | 1 | 1 |
| scholarship | 1 | 1 | 1 |

## By language and style (hybrid-v2)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 43/43 | 0/43 |
| lang hinglish | 37/37 | 0/22 |
| lang hi | 20/20 | 1/13 |
| style caller | 76/76 | 0/69 |
| style dialogue | 10/10 | 0/4 |
| style stt | 12/12 | 1/5 |
| style msg | 2/2 | 0/0 |

