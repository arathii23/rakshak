# Accuracy: dev,dev2 (206 cases) · tag frozen-v2 · 2026-11-20T19:53Z

Mode: replay from cache only · cache hits 206 · new calls 0 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹14.97 of ₹25 cap · 442 calls · 391116 prompt + 48027 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## rules-v1

- Scams flagged (recall): **64.0% (64/100; 95% CI 54.2%–72.7%)**; called "very likely a scam": 31.0% (31/100; 95% CI 22.8%–40.6%)
- Genuine texts flagged (false alarms): **9.0% (7/78; 95% CI 4.4%–17.4%)**; of which "very likely a scam": 3
- Ambiguous texts flagged: 5/28; "very likely a scam" on genuine or ambiguous (severe errors): **3**
- Precision 90.1% · F1 74.9% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 31 | 33 | 36 | 0 |
| genuine | 3 | 4 | 71 | 0 |
| ambiguous | 0 | 5 | 23 | 0 |

Missed scams (36): D004[digital_arrest→no_clear_signs], D007[courier→no_clear_signs], D021[otp_fraud→no_clear_signs], D023[otp_fraud→no_clear_signs], D027[upi_refund→no_clear_signs], D028[call_merge→no_clear_signs], D029[call_merge→no_clear_signs], D031[apk_link→no_clear_signs], D032[apk_link→no_clear_signs], D037[remote_support→no_clear_signs], D038[job_task→no_clear_signs], D040[job_task→no_clear_signs], D041[job_task→no_clear_signs], D042[investment→no_clear_signs], D045[investment→no_clear_signs], D047[loan_fee→no_clear_signs], D050[lottery_prize→no_clear_signs], D051[lottery_prize→no_clear_signs], D057[insurance→no_clear_signs], D063[bank_kyc→no_clear_signs], D066[soft_job→no_clear_signs], D069[bank_kyc→no_clear_signs], E001[code_no_keyword→no_clear_signs], E002[small_test_payment→no_clear_signs], E008[code_no_keyword→no_clear_signs], E009[gift_cards→no_clear_signs], E010[fastag→no_clear_signs], E011[remote_support→no_clear_signs], E013[lottery_prize→no_clear_signs], E014[loan_threat→no_clear_signs], E016[sim_trai→no_clear_signs], E021[bank_kyc→no_clear_signs], E022[job_task→no_clear_signs], E023[remote_support→no_clear_signs], E026[call_merge→no_clear_signs], E028[scholarship→no_clear_signs]
False alarms (7): D118[retelling→warning_signs], D121[landlord→warning_signs], D144[news→likely_scam], D146[card_dispatch→warning_signs], E103[advice→likely_scam], E114[ride_notice→warning_signs], E122[retelling→likely_scam]
Severe (very likely a scam on a non-scam, 3): D144, E103, E122

## rules-v2

- Scams flagged (recall): **83.0% (83/100; 95% CI 74.5%–89.1%)**; called "very likely a scam": 40.0% (40/100; 95% CI 30.9%–49.8%)
- Genuine texts flagged (false alarms): **2.6% (2/78; 95% CI 0.7%–8.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 4/28; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 97.6% · F1 89.7% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 40 | 43 | 17 | 0 |
| genuine | 0 | 2 | 76 | 0 |
| ambiguous | 0 | 4 | 24 | 0 |

Missed scams (17): D004[digital_arrest→no_clear_signs], D007[courier→no_clear_signs], D023[otp_fraud→no_clear_signs], D027[upi_refund→no_clear_signs], D031[apk_link→no_clear_signs], D032[apk_link→no_clear_signs], D037[remote_support→no_clear_signs], D038[job_task→no_clear_signs], D041[job_task→no_clear_signs], D042[investment→no_clear_signs], D050[lottery_prize→no_clear_signs], D063[bank_kyc→no_clear_signs], D066[soft_job→no_clear_signs], D069[bank_kyc→no_clear_signs], E022[job_task→no_clear_signs], E023[remote_support→no_clear_signs], E028[scholarship→no_clear_signs]
False alarms (2): D121[landlord→warning_signs], D146[card_dispatch→warning_signs]
Severe (very likely a scam on a non-scam, 0): none

## ai-v2

- Scams flagged (recall): **100.0% (100/100; 95% CI 96.3%–100.0%)**; called "very likely a scam": 84.0% (84/100; 95% CI 75.6%–89.9%)
- Genuine texts flagged (false alarms): **2.6% (2/78; 95% CI 0.7%–8.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 13/28; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 98.0% · F1 99.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 84 | 16 | 0 | 0 |
| genuine | 0 | 2 | 76 | 0 |
| ambiguous | 1 | 12 | 15 | 0 |

Missed scams (0): none
False alarms (2): E114[ride_notice→warning_signs], E121[bank_branch→warning_signs]
Severe (very likely a scam on a non-scam, 1): D201

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
| rules-v1 | 64.0% (64/100; 95% CI 54.2%–72.7%) | 31% | 9.0% (7/78; 95% CI 4.4%–17.4%) | 3 | 90.1% | 74.9% | 0 |
| rules-v2 | 83.0% (83/100; 95% CI 74.5%–89.1%) | 40% | 2.6% (2/78; 95% CI 0.7%–8.9%) | 0 | 97.6% | 89.7% | 0 |
| ai-v2 | 100.0% (100/100; 95% CI 96.3%–100.0%) | 84% | 2.6% (2/78; 95% CI 0.7%–8.9%) | 1 | 98.0% | 99.0% | 0 |
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

