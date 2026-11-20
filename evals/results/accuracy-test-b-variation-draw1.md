# Accuracy: test-b (98 cases) · tag variation-draw1 · 2026-11-20T20:26Z

Mode: live (cache first, then Sarvam) · sample 1 (a fresh draw for the identical request) · cache hits 0 · new calls 98 · retries 20 · failures 0
Spend ledger (all runs, upper-bound prices): ₹37.35 of ₹37.8 cap · 1008 calls · 991134 prompt + 105079 completion tokens
Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: 0.

## hybrid-v2

- Scams flagged (recall): **100.0% (54/54; 95% CI 93.4%–100.0%)**; called "very likely a scam": 90.7% (49/54; 95% CI 80.1%–96.0%)
- Genuine texts flagged (false alarms): **0.0% (0/31; 95% CI 0.0%–11.0%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 8/13; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 100.0% · F1 100.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 49 | 5 | 0 | 0 |
| genuine | 0 | 0 | 31 | 0 |
| ambiguous | 0 | 8 | 5 | 0 |

## ai-v2

- Scams flagged (recall): **100.0% (54/54; 95% CI 93.4%–100.0%)**; called "very likely a scam": 90.7% (49/54; 95% CI 80.1%–96.0%)
- Genuine texts flagged (false alarms): **0.0% (0/31; 95% CI 0.0%–11.0%)**; of which "very likely a scam": 0
- Ambiguous texts flagged: 8/13; "very likely a scam" on genuine or ambiguous (severe errors): **0**
- Precision 100.0% · F1 100.0% (genuine texts count as the negatives; ambiguous ones are left out)

| label | likely_scam | warning_signs | no_clear_signs | not_enough_info |
|---|---|---|---|---|
| scam | 49 | 5 | 0 | 0 |
| genuine | 0 | 0 | 31 | 0 |
| ambiguous | 0 | 8 | 5 | 0 |

## Side by side

| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |
|---|---|---|---|---|---|---|---|
| hybrid-v2 | 100.0% (54/54; 95% CI 93.4%–100.0%) | 91% | 0.0% (0/31; 95% CI 0.0%–11.0%) | 0 | 100.0% | 100.0% | 0 |
| ai-v2 | 100.0% (54/54; 95% CI 93.4%–100.0%) | 91% | 0.0% (0/31; 95% CI 0.0%–11.0%) | 0 | 100.0% | 100.0% | 0 |

## Recall by scam type (hybrid-v2)

| type | n | flagged | very likely |
|---|---|---|---|
| digital_arrest | 4 | 4 | 4 |
| courier_customs | 4 | 4 | 4 |
| electricity_kyc | 4 | 4 | 0 |
| remote_support | 4 | 4 | 4 |
| task_job | 4 | 4 | 4 |
| investment_group | 4 | 4 | 4 |
| loan_advance_fee | 4 | 4 | 4 |
| lottery_prize | 4 | 4 | 4 |
| insurance_bonus | 4 | 4 | 4 |
| bank_card_code | 3 | 3 | 3 |
| upi_refund | 3 | 3 | 3 |
| relative_emergency | 3 | 3 | 3 |
| fake_authority_bank_loan | 3 | 3 | 3 |
| sim_telecom | 2 | 2 | 2 |
| apk_install | 2 | 2 | 2 |
| call_merge_or_wrong_code | 2 | 2 | 1 |

## By language and style (hybrid-v2)

| slice | scams flagged | genuine flagged |
|---|---|---|
| lang en | 18/18 | 0/10 |
| lang hinglish | 24/24 | 0/17 |
| lang hi | 12/12 | 0/4 |
| style caller | 34/34 | 0/19 |
| style dialogue | 9/9 | 0/5 |
| style stt | 11/11 | 0/7 |

