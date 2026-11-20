# Accuracy: what was measured, what changed, what is still unknown

Written 2026-11-21. Everything here is measured on **invented** texts (written by Claude or by Sarvam's model). **No real call has been tested.** Read the numbers as "how the app behaves on a careful synthetic benchmark", not as "how accurate it is on real calls". Research behind the changes: [`RESEARCH.md`](RESEARCH.md).

## In short

| | First version (as submitted) | This version |
|---|---|---|
| Scam texts flagged, held-out set B (54 texts) | 90.7% (49/54) | **100% (54/54)** |
| Called "very likely a scam" (of those scams) | 59% | **91%** |
| Honest texts flagged, held-out set B (31 texts) | 6.5% (2/31) | **0% (0/31)** |
| Scam texts flagged, held-out set A (55 texts) | not run (credit cap) | **100% (55/55)** |
| Honest texts flagged, held-out set A (39 texts) | not run | **5.1% (2/39)** |

With 54 or 55 texts per set, "0 misses" only means the true miss rate is probably below about 7% (95% interval). The honest-text numbers have intervals of roughly 1% to 17%. Both held-out sets together: 109 of 109 scam texts flagged (interval 96.6% to 100%) and 2 of 70 honest texts flagged (2.9%, interval 0.8% to 9.8%).

## 1. How it was measured

- **Four labelled sets of invented texts**, each text labelled *scam*, *genuine* or *ambiguous* (honest-looking but cannot be told from a scam, such as a relative asking for money or a QR code to pay a delivery): `dev` (146) and `dev2` (60) were used to build and tune the changes; **`test-A`** (110, hand-written by Claude, frozen before any detector work) and **`test-B`** (98, written by Sarvam's model from a brief, checked once by hand before any detector run) were **not used for tuning**. No text appears in two sets (checked by a test).
- **Flagged** = "some warning signs" or "very likely a scam". **Severe error** = "very likely a scam" said about a genuine or ambiguous text.
- **Frozen before the held-out runs.** The detector (prompt, rules, merge) was committed as `689f3d6`. Both held-out sets were then run **once** against that commit (rules-only numbers for both sets were free and run first). Intervals are 95% Wilson intervals.
- **Replay without credits.** Every model answer is cached by a hash of the prompt and text (`evals/cache/chat.jsonl`), so the rule and merge steps can be re-run and checked for free. Spend is counted in a ledger with a hard cap.
- **One sample per text.** The model's answers vary a little between runs; each text was answered once. Run-to-run variation was not measured.

## 2. What changed, and why

1. **Reading the model's answer.** The model sometimes finishes its JSON and then writes blank lines until it runs out of room, so the answer looked broken and the app fell back to the keyword check (it happened on an honest text in the first evaluation). The answer is now repaired or salvaged. A quote the model copies slightly wrongly (a changed vowel sign, a dropped letter) is matched to the nearest stretch of the user's own text, so every highlight is still an exact piece of what was typed.
2. **Merge of rules and AI.** The first version let a keyword hit overrule the AI, which made it worse than the AI alone (more false alarms, and it under-called strong scams as "warning signs"). Now: the AI needs a quote that really is in the text to raise a verdict; "very likely" needs real evidence (with no keyword hit: two separate quoted phrases or one long one) and is not given to a text of under 8 words unless the rules also found two kinds of signal; when the AI says "no clear signs", one thin keyword hit no longer overrules it; when the AI finds nothing but the rules found two kinds of signal, the result is "warning signs", never "very likely"; phrases that honest callers almost never use (asking to **merge calls**, "digital arrest", AnyDesk or TeamViewer) are never outvoted; a story about an earlier call is not a warning; a delivery OTP at the door is at most a warning.
3. **Rules.** New: call merging; a code described without the word OTP ("the six numbers that just came on your phone", "wo code jo aapke phone par aayega"); gift-card codes; "accept the request" payment tricks; payments put as an obligation ("jama karne honge", "डालनी होगी", "you need to pay"); a cab driver's ride PIN. Fewer false alarms from advice ("if someone asks for your PIN, decline"), news about scams, retellings ("I told him no"), and school or hospital counters.
4. **Prompt.** The model is now told the common scam types in India (including ones that avoid the words OTP and PIN) and what normal calls look like (advice, news, retellings, a delivery or ride OTP, a bank fraud check, a bill reminder pointing to the app, an in-person visit).

## 3. Results

### Held-out set B (written by Sarvam's model, 54 scam / 31 genuine / 13 ambiguous)

| version | scams flagged | very likely | genuine flagged | severe |
|---|---|---|---|---|
| First version (rules + AI) | 90.7% (49/54; 80.1–96.0%) | 59% | 6.5% (2/31; 1.8–20.7%) | 0 |
| First version's model alone | 96.3% (52/54) | 83% | 0% (0/31) | 0 |
| **This version (rules + AI)** | **100% (54/54; 93.4–100%)** | **91%** | **0% (0/31; 0–11.0%)** | **0** |
| Keyword rules only, first version | 61.1% (33/54) | 28% | 6.5% (2/31) | 0 |
| Keyword rules only, this version | 77.8% (42/54) | 31% | 12.9% (4/31) | 0 |

Set B was written by the same family of model that judges the texts, so it probably flatters the AI.

### Held-out set A (hand-written, 55 scam / 39 genuine / 16 ambiguous)

| version | scams flagged | very likely | genuine flagged | severe |
|---|---|---|---|---|
| **This version, as frozen** | **100% (55/55; 93.5–100%)** | **91%** | **5.1% (2/39; 1.4–16.9%)** | 1 |
| This version's model alone | 100% (55/55) | 89% | 2.6% (1/39) | 1 |
| Keyword rules only, first version | 60.0% (33/55) | 16% | 7.7% (3/39) | 2 |
| Keyword rules only, this version | 65.5% (36/55) | 24% | 7.7% (3/39) | 2 |

The first version was **not** run on set A (credit cap). The two false alarms were a gas delivery person at the door asking for cash (a warning, the model and the rules both) and a retelling in Hinglish about a friend's call, which the model read correctly but the rules called "very likely".

### Development sets (206 texts; used to tune, so these are optimistic)

| version | scams flagged | very likely | genuine flagged | severe |
|---|---|---|---|---|
| First version | 93.0% (93/100) | 59% | 9.1% (7/77) | 4 |
| New merge and rules, first prompt | 100% (100/100) | 90% | 2.6% (2/78) | 1 |
| **This version** | **100% (100/100)** | **89%** | **1.3% (1/78)** | **0** |

The keyword rules alone went from 64% to 83% of scams on these sets, but only 61% to 78% on set B and 60% to 66% on set A, which is the honest size of the gain outside the texts they were written against. **That is the "Limited check" level**: on the held-out sets it catches about two-thirds to three-quarters of the scams and wrongly flags about 8% to 13% of the honest texts. It is a fallback, not a detector.

### Whole calls through the real Live Guard code (13 invented calls, speech replaced by the script)

`evals/results/live-sim.md`. Six honest calls: one raised a warning (a bank fraud team telling the customer it blocked a card nobody used; the alert came after the first 8 seconds, before the caller said the card was blocked for the customer's safety, and by design it never goes down during a call). Two unclear calls (a delivery partner at the door, an aunt asking for money): warnings, never "very likely". Five scam calls: all five alerted, all five reached "very likely", the first alert on average after 1.4 chunks (about 11 seconds).

### Speech check (8 invented clips through a phone-and-room sound simulation, then Sarvam speech-to-text)

`evals/results/speech-check.md`. Word errors of 10% to 33% (words dropped or replaced, "ride PIN" heard as "ride in Venue city", "fifty thousand rupees to this safe account" as "fifty. ₹2000 to their bank account") and still: 4 of 4 scam clips flagged, all "very likely"; 0 of 4 honest clips flagged. Eight clips, one voice per language, one noise setting: this shows the pipeline works on degraded speech, not how well.

## 4. Spend

800 calls (nearly all chat answers, plus the speech chunks), 751,533 prompt and 83,683 completion tokens, 64 seconds of audio. **₹28.77 at the highest prices seen** (₹29.28 and ₹73.2 per million tokens, ₹0.60 per minute; the ledger's cap was ₹30). At the prices on Sarvam's own pages (₹10 and ₹25 per million tokens, ₹0.49 per minute) it is about ₹10. Compare with the Sarvam dashboard.

## 5. What was found after the held-out run

The numbers above are the ones measured at the freeze. Looking at the two set-A errors afterwards showed one rule-versus-AI problem worth fixing: when the model correctly said "no clear signs" about a retelling, the rules (two kinds of keyword signal) overruled it with "very likely". The merge now answers "warning signs" when the rules found two kinds of signal and the model found none. Effect: the one set-A severe error became a warning; nothing else changed on any set (checked by replaying all four sets from the saved answers). **Set A is no longer a clean test after this fix**; set B was not touched. The gas-delivery cash case was left alone.

## 6. What is still unknown

- **Real calls.** Nobody has run the app on a real call. Real callers are longer, interrupted, in other dialects and often not scripted; real honest calls include things nobody invented here.
- **The test texts are artificial and mostly clear.** All texts were written by an AI; set B by the same model family that judges them; the "ambiguous" label is a judgement. Real accuracy will be lower than these numbers.
- **Small samples.** Intervals above show how wide it is: one more miss or false alarm moves the rates by 2 to 3 points.
- **Variation.** The AI is not deterministic and borderline texts can flip between runs; this was not measured (each text was answered once).
- **Live Guard.** A warning stays for the rest of the call, so any early thin warning on an honest call (one of six in the simulation) stays. Speech was tested on 8 synthetic clips only, with one voice and one noise level; Hinglish speech through a Hindi voice is not the same as a person speaking.
- **Hindi wording** of the explanations and next steps has not been reviewed by a native speaker.
- **Not measured at all:** noisy real speakerphone audio on a real phone, other noise levels, other accents, calls longer than a minute, repeated runs, and the first version on set A.

## 7. Reproduce

```bash
npm test                                                     # 110 tests, no network
node evals/acc/run.js --set dev,dev2 --configs rules-v2,hybrid-v2          # replay from saved answers (free)
node evals/acc/run.js --set test-b --configs hybrid-v2 --live --budget 30  # new texts cost credits (needs the key)
node evals/live-sim/run.js           # whole calls through Live Guard (replay)
node evals/speech/run.js --live      # speech check (makes audio on a Mac, spends credits)
```

Test sets print only totals unless `--reveal` is added; do that only after the numbers are fixed.
