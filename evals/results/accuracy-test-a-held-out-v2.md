# Accuracy: test-a (110 cases) · tag held-out-v2 · 2026-11-20T19:55Z

Mode: live (cache first, then Sarvam) · cache hits 0 · new calls 110 · retries 54 · failures 0
Spend ledger (all runs, upper-bound prices): ₹23.54 of ₹30 cap · 650 calls · 630717 prompt + 69290 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## ai-v2

- Scams flagged (recall): **100.0% (55/55; 95% CI 93.5%–100.0%)**; called "very likely a scam": 89.1% (49/55; 95% CI 78.2%–94.9%)
- Genuine texts flagged (false alarms): **2.6% (1/39; 95% CI 0.5%–13.2%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 4/16; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 98.2% · F1 99.1% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 49 | 6 | 0 | 0 |
| genuine | 0 | 1 | 38 | 0 |
| ambiguous | 1 | 3 | 12 | 0 |

## hybrid-v2

- Scams flagged (recall): **100.0% (55/55; 95% CI 93.5%–100.0%)**; called "very likely a scam": 90.9% (50/55; 95% CI 80.4%–96.1%)
- Genuine texts flagged (false alarms): **5.1% (2/39; 95% CI 1.4%–16.9%)**; of which "very likely a scam": 1
- Ambiguous texts flagged: 4/16; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 96.5% · F1 98.2% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 50 | 5 | 0 | 0 |
| genuine | 1 | 1 | 37 | 0 |
| ambiguous | 0 | 4 | 12 | 0 |

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| ai-v2 | 100.0% (55/55; 95% CI 93.5%–100.0%) | 89% | 2.6% (1/39; 95% CI 0.5%–13.2%) | 1 | 98.2% | 99.1% | 0 |
| hybrid-v2 | 100.0% (55/55; 95% CI 93.5%–100.0%) | 91% | 5.1% (2/39; 95% CI 1.4%–16.9%) | 1 | 96.5% | 98.2% | 0 |

## Recall by scam type (hybrid-v2)

| type | n | flagged | very likely |
|---|---|---|---|
| digital_arrest | 7 | 7 | 7 |
| bank_kyc | 6 | 6 | 6 |
| courier | 4 | 4 | 3 |
| sim_trai | 3 | 3 | 2 |
| electricity | 3 | 3 | 2 |
| otp_fraud | 3 | 3 | 2 |
| apk_link | 3 | 3 | 3 |
| relative_emergency | 3 | 3 | 3 |
| remote_support | 2 | 2 | 2 |
| job_task | 2 | 2 | 2 |
| investment | 2 | 2 | 2 |
| loan_fee | 2 | 2 | 2 |
| loan_threat | 1 | 1 | 1 |
| upi_refund | 1 | 1 | 1 |
| lottery_prize | 1 | 1 | 1 |
| insurance | 1 | 1 | 1 |
| kidnap_hoax | 1 | 1 | 1 |
| army_sale | 1 | 1 | 1 |
| esim_swap | 1 | 1 | 1 |
| tax_refund | 1 | 1 | 1 |
| pension | 1 | 1 | 1 |
| fastag | 1 | 1 | 1 |
| hacked_friend | 1 | 1 | 0 |
| sextortion_cyber | 1 | 1 | 1 |
| scholarship | 1 | 1 | 1 |
| whatsapp_takeover | 1 | 1 | 1 |
| gas_kyc | 1 | 1 | 1 |

## By language and style (hybrid-v2)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 27/27 | 0/20 |
| lang hinglish | 18/18 | 2/11 |
| lang hi | 10/10 | 0/8 |
| style dialogue | 4/4 | 0/3 |
| style caller | 42/42 | 1/32 |
| style chunk | 2/2 | 0/0 |
| style stt | 5/5 | 1/3 |
| style msg | 2/2 | 0/1 |

