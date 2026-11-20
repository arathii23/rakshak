# Accuracy: test-a (110 cases) · tag variation-draw1 · 2026-11-20T20:25Z

Mode: live (cache first, then Sarvam) · sample 1 (a fresh draw for the identical request) · cache hits 3 · new calls 107 · retries 4 · failures 0
Spend ledger (all runs, upper-bound prices): ₹33.19 of ₹37.8 cap · 910 calls · 876769 prompt + 94067 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## hybrid-v2

- Scams flagged (recall): **100.0% (55/55; 95% CI 93.5%–100.0%)**; called "very likely a scam": 92.7% (51/55; 95% CI 82.7%–97.1%)
- Genuine texts flagged (false alarms): **7.7% (3/39; 95% CI 2.7%–20.3%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 4/16; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 94.8% · F1 97.3% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 51 | 4 | 0 | 0 |
| genuine | 0 | 3 | 36 | 0 |
| ambiguous | 0 | 4 | 12 | 0 |

## ai-v2

- Scams flagged (recall): **100.0% (55/55; 95% CI 93.5%–100.0%)**; called "very likely a scam": 92.7% (51/55; 95% CI 82.7%–97.1%)
- Genuine texts flagged (false alarms): **5.1% (2/39; 95% CI 1.4%–16.9%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 4/16; "very likely a scam" on genuine or ambiguous (severe errors): **1**
- Precision 96.5% · F1 98.2% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 51 | 4 | 0 | 0 |
| genuine | 0 | 2 | 37 | 0 |
| ambiguous | 1 | 3 | 12 | 0 |

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| hybrid-v2 | 100.0% (55/55; 95% CI 93.5%–100.0%) | 93% | 7.7% (3/39; 95% CI 2.7%–20.3%) | 0 | 94.8% | 97.3% | 0 |
| ai-v2 | 100.0% (55/55; 95% CI 93.5%–100.0%) | 93% | 5.1% (2/39; 95% CI 1.4%–16.9%) | 1 | 96.5% | 98.2% | 0 |

## Recall by scam type (hybrid-v2)

| type | n | flagged | very likely |
|---|---|---|---|
| digital_arrest | 7 | 7 | 7 |
| bank_kyc | 6 | 6 | 6 |
| courier | 4 | 4 | 4 |
| sim_trai | 3 | 3 | 3 |
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
| army_sale | 1 | 1 | 0 |
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
| lang en | 27/27 | 1/20 |
| lang hinglish | 18/18 | 2/11 |
| lang hi | 10/10 | 0/8 |
| style dialogue | 4/4 | 0/3 |
| style caller | 42/42 | 1/32 |
| style chunk | 2/2 | 0/0 |
| style stt | 5/5 | 1/3 |
| style msg | 2/2 | 1/1 |

