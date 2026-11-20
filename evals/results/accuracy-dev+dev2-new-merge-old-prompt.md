# Accuracy: dev,dev2 (206 cases) · tag merge-v2c · 2026-11-20T19:46Z

Mode: replay from cache only · cache hits 412 · new calls 0 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹6.72 of ₹25 cap · 236 calls · 157326 prompt + 28828 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## ai-v1 — 1 cases had no answer (ai_bad_response); numbers cover the rest

- Scams flagged (recall): **98.0% (98/100; 95% CI 93.0%–99.4%)**; called "very likely a scam": 90.0% (90/100; 95% CI 82.6%–94.5%)
- Genuine texts flagged (false alarms): **2.6% (2/77; 95% CI 0.7%–9.0%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 11/28; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 98.0% · F1 98.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 90 | 8 | 2 | 0 |
| genuine | 0 | 2 | 75 | 0 |
| ambiguous | 1 | 10 | 17 | 0 |

Missed scams (2): D028[call_merge→no_clear_signs], D029[call_merge→no_clear_signs]
False alarms (2): D118[retelling→warning_signs], E122[retelling→warning_signs]
Severe (very likely a scam on a non-scam, 1): E205

## hybrid-v1 — 1 cases had no answer (ai_bad_response); numbers cover the rest

- Scams flagged (recall): **93.0% (93/100; 95% CI 86.3%–96.6%)**; called "very likely a scam": 59.0% (59/100; 95% CI 49.2%–68.1%)
- Genuine texts flagged (false alarms): **9.1% (7/77; 95% CI 4.5%–17.6%)**; of which "very likely a scam": 3
- Ambiguous texts flagged: 13/28; "very likely a scam" on genuine or ambiguous (severe errors): **4**
- Precision 93.0% · F1 93.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 59 | 34 | 7 | 0 |
| genuine | 3 | 4 | 70 | 0 |
| ambiguous | 1 | 12 | 15 | 0 |

Missed scams (7): D028[call_merge→no_clear_signs], D029[call_merge→no_clear_signs], D051[lottery_prize→no_clear_signs], D066[soft_job→no_clear_signs], E002[small_test_payment→no_clear_signs], E021[bank_kyc→no_clear_signs], E028[scholarship→no_clear_signs]
False alarms (7): D118[retelling→warning_signs], D121[landlord→warning_signs], D144[news→likely_scam], D146[card_dispatch→warning_signs], E103[advice→likely_scam], E114[ride_notice→warning_signs], E122[retelling→likely_scam]
Severe (very likely a scam on a non-scam, 4): D144, E103, E122, E205

## hybrid-v2

- Scams flagged (recall): **100.0% (100/100; 95% CI 96.3%–100.0%)**; called "very likely a scam": 90.0% (90/100; 95% CI 82.6%–94.5%)
- Genuine texts flagged (false alarms): **2.6% (2/78; 95% CI 0.7%–8.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 11/28; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 98.0% · F1 99.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 90 | 10 | 0 | 0 |
| genuine | 0 | 2 | 76 | 0 |
| ambiguous | 1 | 10 | 17 | 0 |

Missed scams (0): none
False alarms (2): D118[retelling→warning_signs], E122[retelling→warning_signs]
Severe (very likely a scam on a non-scam, 1): E205

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| ai-v1 | 98.0% (98/100; 95% CI 93.0%–99.4%) | 90% | 2.6% (2/77; 95% CI 0.7%–9.0%) | 1 | 98.0% | 98.0% | 1 |
| hybrid-v1 | 93.0% (93/100; 95% CI 86.3%–96.6%) | 59% | 9.1% (7/77; 95% CI 4.5%–17.6%) | 4 | 93.0% | 93.0% | 1 |
| hybrid-v2 | 100.0% (100/100; 95% CI 96.3%–100.0%) | 90% | 2.6% (2/78; 95% CI 0.7%–8.9%) | 1 | 98.0% | 99.0% | 0 |

## Recall by scam type (hybrid-v1)

| type | n | flagged | very likely |
|---|---|---|---|
| soft_job | 1 | 0 | 0 |
| small_test_payment | 1 | 0 | 0 |
| scholarship | 1 | 0 | 0 |
| call_merge | 3 | 1 | 0 |
| lottery_prize | 4 | 3 | 1 |
| bank_kyc | 8 | 7 | 5 |
| job_task | 7 | 7 | 3 |
| digital_arrest | 6 | 6 | 5 |
| electricity | 6 | 6 | 3 |
| remote_support | 6 | 6 | 3 |
| courier | 5 | 5 | 4 |
| otp_fraud | 5 | 5 | 3 |
| upi_refund | 5 | 5 | 4 |
| apk_link | 5 | 5 | 2 |
| sim_trai | 4 | 4 | 3 |
| investment | 4 | 4 | 2 |
| loan_fee | 4 | 4 | 3 |
| relative_emergency | 4 | 4 | 4 |
| insurance | 3 | 3 | 2 |
| aadhaar_pan | 3 | 3 | 3 |
| soft_bank | 3 | 3 | 3 |
| fake_support | 2 | 2 | 2 |
| code_no_keyword | 2 | 2 | 0 |
| relative_new_number | 2 | 2 | 1 |
| qr_cashback | 1 | 1 | 1 |
| gift_parcel | 1 | 1 | 1 |
| gift_cards | 1 | 1 | 0 |
| fastag | 1 | 1 | 0 |
| loan_threat | 1 | 1 | 0 |
| kidnap_hoax | 1 | 1 | 1 |

## By language and style (hybrid-v1)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 41/43 | 6/43 |
| lang hinglish | 34/37 | 1/21 |
| lang hi | 18/20 | 0/13 |
| style caller | 69/76 | 7/68 |
| style dialogue | 10/10 | 0/4 |
| style stt | 12/12 | 0/5 |
| style msg | 2/2 | 0/0 |

