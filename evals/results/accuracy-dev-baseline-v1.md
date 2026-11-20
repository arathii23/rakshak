# Accuracy: dev (146 cases) · tag baseline-v1 · 2026-11-20T19:27Z

Mode: live (cache first, then Sarvam) · cache hits 6 · new calls 140 · retries 34 · failures 0
Spend ledger (all runs, upper-bound prices): ₹4.07 of ₹30 cap · 146 calls · 104033 prompt + 13931 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## rules-v1

- Scams flagged (recall): **69.4% (50/72; 95% CI 58.0%–78.9%)**; called "very likely a scam": 40.3% (29/72; 95% CI 29.7%–51.8%)
- Genuine texts flagged (false alarms): **7.4% (4/54; 95% CI 2.9%–17.6%)**; of which "very likely a scam": 1
- Ambiguous texts flagged: 1/20; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 92.6% · F1 79.4% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 29 | 21 | 22 | 0 |
| genuine | 1 | 3 | 50 | 0 |
| ambiguous | 0 | 1 | 19 | 0 |

Missed scams (22): D004[digital_arrest→no_clear_signs], D007[courier→no_clear_signs], D021[otp_fraud→no_clear_signs], D023[otp_fraud→no_clear_signs], D027[upi_refund→no_clear_signs], D028[call_merge→no_clear_signs], D029[call_merge→no_clear_signs], D031[apk_link→no_clear_signs], D032[apk_link→no_clear_signs], D037[remote_support→no_clear_signs], D038[job_task→no_clear_signs], D040[job_task→no_clear_signs], D041[job_task→no_clear_signs], D042[investment→no_clear_signs], D045[investment→no_clear_signs], D047[loan_fee→no_clear_signs], D050[lottery_prize→no_clear_signs], D051[lottery_prize→no_clear_signs], D057[insurance→no_clear_signs], D063[bank_kyc→no_clear_signs], D066[soft_job→no_clear_signs], D069[bank_kyc→no_clear_signs]
False alarms (4): D118[retelling→warning_signs], D121[landlord→warning_signs], D144[news→likely_scam], D146[card_dispatch→warning_signs]
Severe (very likely a scam on a non-scam, 1): D144

## ai-v1 — 1 cases had no answer (ai_bad_response); numbers cover the rest

- Scams flagged (recall): **97.2% (70/72; 95% CI 90.4%–99.2%)**; called "very likely a scam": 94.4% (68/72; 95% CI 86.6%–97.8%)
- Genuine texts flagged (false alarms): **1.9% (1/53; 95% CI 0.3%–9.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 7/20; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 98.6% · F1 97.9% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 68 | 2 | 2 | 0 |
| genuine | 0 | 1 | 52 | 0 |
| ambiguous | 0 | 7 | 13 | 0 |

Missed scams (2): D028[call_merge→no_clear_signs], D029[call_merge→no_clear_signs]
False alarms (1): D118[retelling→warning_signs]
Severe (very likely a scam on a non-scam, 0): none

## hybrid-v1 — 1 cases had no answer (ai_bad_response); numbers cover the rest

- Scams flagged (recall): **94.4% (68/72; 95% CI 86.6%–97.8%)**; called "very likely a scam": 66.7% (48/72; 95% CI 55.2%–76.5%)
- Genuine texts flagged (false alarms): **7.5% (4/53; 95% CI 3.0%–17.9%)**; of which "very likely a scam": 1
- Ambiguous texts flagged: 7/20; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 94.4% · F1 94.4% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 48 | 20 | 4 | 0 |
| genuine | 1 | 3 | 49 | 0 |
| ambiguous | 0 | 7 | 13 | 0 |

Missed scams (4): D028[call_merge→no_clear_signs], D029[call_merge→no_clear_signs], D051[lottery_prize→no_clear_signs], D066[soft_job→no_clear_signs]
False alarms (4): D118[retelling→warning_signs], D121[landlord→warning_signs], D144[news→likely_scam], D146[card_dispatch→warning_signs]
Severe (very likely a scam on a non-scam, 1): D144

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| rules-v1 | 69.4% (50/72; 95% CI 58.0%–78.9%) | 40% | 7.4% (4/54; 95% CI 2.9%–17.6%) | 1 | 92.6% | 79.4% | 0 |
| ai-v1 | 97.2% (70/72; 95% CI 90.4%–99.2%) | 94% | 1.9% (1/53; 95% CI 0.3%–9.9%) | 0 | 98.6% | 97.9% | 1 |
| hybrid-v1 | 94.4% (68/72; 95% CI 86.6%–97.8%) | 67% | 7.5% (4/53; 95% CI 3.0%–17.9%) | 1 | 94.4% | 94.4% | 1 |

## Recall by scam type (hybrid-v1)

| type | n | flagged | very likely |
|---|---|---|---|
| call_merge | 2 | 0 | 0 |
| soft_job | 1 | 0 | 0 |
| lottery_prize | 3 | 2 | 1 |
| digital_arrest | 6 | 6 | 5 |
| bank_kyc | 6 | 6 | 4 |
| upi_refund | 5 | 5 | 4 |
| job_task | 5 | 5 | 2 |
| courier | 4 | 4 | 3 |
| electricity | 4 | 4 | 2 |
| otp_fraud | 4 | 4 | 2 |
| apk_link | 4 | 4 | 2 |
| remote_support | 4 | 4 | 3 |
| investment | 4 | 4 | 2 |
| relative_emergency | 4 | 4 | 4 |
| sim_trai | 3 | 3 | 3 |
| loan_fee | 3 | 3 | 2 |
| insurance | 3 | 3 | 2 |
| soft_bank | 3 | 3 | 3 |
| aadhaar_pan | 2 | 2 | 2 |
| fake_support | 2 | 2 | 2 |

## By language and style (hybrid-v1)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 29/30 | 3/29 |
| lang hinglish | 26/27 | 1/15 |
| lang hi | 13/15 | 0/9 |
| style caller | 48/52 | 4/47 |
| style dialogue | 8/8 | 0/3 |
| style stt | 10/10 | 0/3 |
| style msg | 2/2 | 0/0 |

