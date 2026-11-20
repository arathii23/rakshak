# Testing: expected vs actual, and what is NOT tested

All test texts are **synthetic**, written by Claude for testing. None are real calls. No real-user testing has been done.

## 1. Automated tests: `npm test`

Stubbed Sarvam, no network, no credits. **Result of the latest run: 78 tests, 78 pass, 0 fail** (`evals/results/unit-tests-run.txt`).

Covers: rule detection and false positives (single words, "never share your OTP", doorstep delivery OTP, official-channel reminders); AI merge guards (AI cannot reach "very likely a scam" alone, cannot raise a verdict without a quote that exists in the text, cannot lower a rule verdict, one- or two-word AI quotes cannot raise a verdict, wrong-script explanation falls back); empty/invalid/too-long input; service failures (HTTP 500, 503, 429, 402, 401, 403, network failure, malformed model output) producing a labelled limited check; masking of long digit strings before they reach the AI; no "safe" verdict and no percentages; recording validation (empty, silent, too short, too long) **before** credits are spent; rate and daily limits; the server log containing no text, audio or IPs; WAV encoder against the server validator; Live Guard sessions (create, chunking, alert only goes up, caps, wipe on end/idle, viewer limits, bad-code limits, SSE refusal).

## 2. Eval cases: 63 synthetic cases through the real pipeline

Groups: scams in English, Hinglish and Hindi; genuine calls (delivery, bank, service, family, official); advice such as "never share your OTP"; single keywords alone; unclear/very short input; 24 differently worded variants.

| Mode | Command | Result file | Result |
|---|---|---|---|
| Limited (rules only, no AI) | `npm run eval` | `evals/results/limited.md` | 63/63 as expected; V07 is a **known limit** (a paraphrase the keyword rules cannot catch) and is counted as expected, not as a pass of the rules |
| Real Sarvam AI + rules | `npm run eval:live` | `evals/results/live.md` | **Latest run 63/63.** See history below |

**History of live runs (kept honest, the AI is not deterministic):**

1. First live run: **60/63.** Three false positives, where the AI called ordinary texts "some warning signs": G10 (police station asks the person to visit with documents), K03 (the bare words "OTP police bank urgent"), V20 (a police call asking the person to visit tomorrow with ID).
2. Fix: added a prompt line that an in-person visit/ID request with no demand or threat is normal; and two code guards (with no rule signal, an AI verdict is ignored for texts under 6 words, and ignored when all its quotes are only one or two words).
3. Second run: 62/63 (K04 flagged on the quotes "my OTP" and "police"); fixed by the one-or-two-word guard.
4. Two further runs: 63/63 each.

**Caveat:** the fixes were made after seeing these exact failures, so the 63/63 is not an unbiased accuracy measure. It shows the known failure modes are handled, not that the app is accurate on real calls. The case set was written by the same author as the rules (see `evals/results/limited-run1-before-fixes.md` for the first-run failures on the second set).

## 3. Real-service smoke tests (one run each, on 2026-11-20)

| Check | Expected | Actual |
|---|---|---|
| Text-to-speech (Hindi sentence) via `/api/speak` | 200 and audio | 200, `audio/mpeg`, ~200 KB. **Whether it sounds clear was not listened to.** |
| Speech-to-text of that audio converted to 16 kHz mono WAV via `/api/transcribe` | Hindi/English mix back | Transcript matched the sentence, with English words in Latin script |
| Live Guard session, two real ~6 s clips of that speech sent to `/api/live/chunk` | Alert rises from some warning signs to very likely a scam; highlights are exact substrings | Chunk 1: warning signs; chunk 2: very likely a scam, with highlights on "digital Arrest", "किसी को मत बताइए", "OTP बताइए" |
| Session end | Transcript and alert wiped | `latest.text` empty and `alert` null after end; only the final level remains |

The audio here is **clean computer-generated speech**, not a phone speaker in a room, so it says nothing about accuracy on real calls.

## 4. Not tested (do not assume these work)

- **Live Guard on a real call**, same phone on speaker or with a second device next to the speaker. Many phones mute the microphone for apps during a call. Whether the other person's voice is heard is **unknown**.
- **Automatic start for numbers not in contacts:** not built. A web page cannot detect incoming calls or read contacts; it needs a native Android app.
- iOS: capturing call audio is not possible; background behaviour of the listener page when the screen locks is untested.
- Real microphone capture on real Android and iPhone browsers (the development browser blocks the mic; the encoder is unit-tested).
- Audible quality of read-aloud audio in Hindi; STT accuracy on noisy, accented or compressed speakerphone audio.
- Hindi UI and explanation wording reviewed by a native speaker (written with AI help).
- Hosting provider's proxy headers: whether each visitor gets their own rate-limit bucket (checked after deploy, see section 5).
- Scam-detection accuracy on real calls; false-positive rate on real calls. No percentages are claimed.

## 5. Deployment checks

Filled in after deployment (see the final report).

## 6. Cost arithmetic (default caps, worst case per day)

Daily caps: 250 AI checks, 1200 seconds of speech-to-text, 8000 characters of read-aloud. These are caps, not measured spend; the real hard stop is the Sarvam credit balance. Check actual rates on Sarvam's pricing page before relying on any rupee figure.
