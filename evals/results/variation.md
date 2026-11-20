# Run-to-run variation: the same texts, the same request, answered twice

Sets: test-a + test-b · first draw = the saved original answers (sample 0), second draw = sample 1 (a new answer to the identical request) · 2026-11-21
The second draw is 208 model calls, about ₹8.58 at the highest prices seen (the pricing pages say less). The texts are invented. This prints verdicts and ids only.

## hybrid-v2 (what the app returns)

| | first draw | second draw |
|---|---|---|
| scams flagged | 100.0% (109/109; 95% CI 96.6%–100.0%) | 100.0% (109/109; 95% CI 96.6%–100.0%) |
| scams called "very likely" | 90.8% | 91.7% |
| genuine texts flagged | 2.9% (2/70; 95% CI 0.8%–9.8%) | 4.3% (3/70; 95% CI 1.5%–11.9%) |
| ambiguous texts flagged | 12/29 | 12/29 |
| "very likely" on a genuine or ambiguous text (severe) | 0 | 0 |

- Same four-way verdict both times: **97.1% (202/208; 95% CI 93.9%–98.7%)**
- Same flagged-or-not decision both times: **98.6% (205/208; 95% CI 95.8%–99.5%)**
- The model's raw answer identical both times (where it was called): 1.4% (3/208; 95% CI 0.5%–4.2%)

| label | texts | same verdict | flagged both times | flagged once | not flagged either time | "very likely" both times | "very likely" once |
|---|---|---|---|---|---|---|---|
| scam | 109 | 106 | 109 | 0 | 0 | 98 | 3 |
| genuine | 70 | 69 | 2 | 1 | 67 | 0 | 0 |
| ambiguous | 29 | 27 | 11 | 2 | 16 | 0 | 0 |

Texts whose verdict changed (6; ids only):

- TA007 (scam, courier): warning_signs → likely_scam
- TA037 (scam, army_sale): likely_scam → warning_signs
- TA045 (scam, sim_trai): warning_signs → likely_scam
- TA122 (genuine, otp_message): no_clear_signs → warning_signs — **crossed the flagged / not-flagged line**
- TB081 (ambiguous, customer_callback): no_clear_signs → warning_signs — **crossed the flagged / not-flagged line**
- TB093 (ambiguous, loan_telemarketing): warning_signs → no_clear_signs — **crossed the flagged / not-flagged line**

## ai-v2 (the model's own verdict, before the rules and guards)

| | first draw | second draw |
|---|---|---|
| scams flagged | 100.0% (109/109; 95% CI 96.6%–100.0%) | 100.0% (109/109; 95% CI 96.6%–100.0%) |
| scams called "very likely" | 89.9% | 91.7% |
| genuine texts flagged | 1.4% (1/70; 95% CI 0.3%–7.7%) | 2.9% (2/70; 95% CI 0.8%–9.8%) |
| ambiguous texts flagged | 12/29 | 12/29 |
| "very likely" on a genuine or ambiguous text (severe) | 1 | 1 |

- Same four-way verdict both times: **96.6% (201/208; 95% CI 93.2%–98.4%)**
- Same flagged-or-not decision both times: **98.6% (205/208; 95% CI 95.8%–99.5%)**
- The model's raw answer identical both times (where it was called): 1.4% (3/208; 95% CI 0.5%–4.2%)

| label | texts | same verdict | flagged both times | flagged once | not flagged either time | "very likely" both times | "very likely" once |
|---|---|---|---|---|---|---|---|
| scam | 109 | 105 | 109 | 0 | 0 | 97 | 4 |
| genuine | 70 | 69 | 1 | 1 | 68 | 0 | 0 |
| ambiguous | 29 | 27 | 11 | 2 | 16 | 1 | 0 |

Texts whose verdict changed (7; ids only):

- TA007 (scam, courier): warning_signs → likely_scam
- TA011 (scam, sim_trai): warning_signs → likely_scam
- TA037 (scam, army_sale): likely_scam → warning_signs
- TA045 (scam, sim_trai): warning_signs → likely_scam
- TA122 (genuine, otp_message): no_clear_signs → warning_signs — **crossed the flagged / not-flagged line**
- TB081 (ambiguous, customer_callback): no_clear_signs → warning_signs — **crossed the flagged / not-flagged line**
- TB093 (ambiguous, loan_telemarketing): warning_signs → no_clear_signs — **crossed the flagged / not-flagged line**

Two draws per text is a small look at variation, not a full measure: a text that stayed the same twice can still differ on a third try, and the texts are all invented.
