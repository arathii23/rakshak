# Accuracy: test-a (110 cases) · tag held-out-rules · 2026-11-20T19:53Z

Mode: replay from cache only · cache hits 0 · new calls 0 · retries 0 · failures 0
Spend ledger (all runs, upper-bound prices): ₹14.97 of ₹25 cap · 442 calls · 391116 prompt + 48027 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## rules-v1

- Scams flagged (recall): **60.0% (33/55; 95% CI 46.8%–71.9%)**; called "very likely a scam": 16.4% (9/55; 95% CI 8.9%–28.3%)
- Genuine texts flagged (false alarms): **7.7% (3/39; 95% CI 2.7%–20.3%)**; of which "very likely a scam": 2
- Ambiguous texts flagged: 2/16; "very likely a scam" on genuine or ambiguous (severe errors): **2**
- Precision 91.7% · F1 72.5% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 9 | 24 | 22 | 0 |
| genuine | 2 | 1 | 36 | 0 |
| ambiguous | 0 | 2 | 14 | 0 |

## rules-v2

- Scams flagged (recall): **65.5% (36/55; 95% CI 52.3%–76.6%)**; called "very likely a scam": 23.6% (13/55; 95% CI 14.4%–36.3%)
- Genuine texts flagged (false alarms): **7.7% (3/39; 95% CI 2.7%–20.3%)**; of which "very likely a scam": 2
- Ambiguous texts flagged: 1/16; "very likely a scam" on genuine or ambiguous (severe errors): **2**
- Precision 92.3% · F1 76.6% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 13 | 23 | 19 | 0 |
| genuine | 2 | 1 | 36 | 0 |
| ambiguous | 0 | 1 | 15 | 0 |

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| rules-v1 | 60.0% (33/55; 95% CI 46.8%–71.9%) | 16% | 7.7% (3/39; 95% CI 2.7%–20.3%) | 2 | 91.7% | 72.5% | 0 |
| rules-v2 | 65.5% (36/55; 95% CI 52.3%–76.6%) | 24% | 7.7% (3/39; 95% CI 2.7%–20.3%) | 2 | 92.3% | 76.6% | 0 |

## Recall by scam type (rules-v2)

| type | n | flagged | very likely |
|---|---|---|---|
| insurance | 1 | 0 | 0 |
| army_sale | 1 | 0 | 0 |
| esim_swap | 1 | 0 | 0 |
| pension | 1 | 0 | 0 |
| sextortion_cyber | 1 | 0 | 0 |
| apk_link | 3 | 1 | 0 |
| digital_arrest | 7 | 3 | 2 |
| bank_kyc | 6 | 3 | 2 |
| investment | 2 | 1 | 0 |
| sim_trai | 3 | 2 | 1 |
| electricity | 3 | 2 | 0 |
| otp_fraud | 3 | 2 | 1 |
| relative_emergency | 3 | 2 | 0 |
| courier | 4 | 4 | 0 |
| remote_support | 2 | 2 | 1 |
| job_task | 2 | 2 | 0 |
| loan_fee | 2 | 2 | 1 |
| loan_threat | 1 | 1 | 0 |
| upi_refund | 1 | 1 | 0 |
| lottery_prize | 1 | 1 | 1 |
| kidnap_hoax | 1 | 1 | 0 |
| tax_refund | 1 | 1 | 1 |
| fastag | 1 | 1 | 0 |
| hacked_friend | 1 | 1 | 0 |
| scholarship | 1 | 1 | 1 |
| whatsapp_takeover | 1 | 1 | 1 |
| gas_kyc | 1 | 1 | 1 |

## By language and style (rules-v2)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 16/27 | 1/20 |
| lang hinglish | 13/18 | 2/11 |
| lang hi | 7/10 | 0/8 |
| style dialogue | 3/4 | 0/3 |
| style caller | 28/42 | 2/32 |
| style chunk | 1/2 | 0/0 |
| style stt | 2/5 | 1/3 |
| style msg | 2/2 | 0/1 |

