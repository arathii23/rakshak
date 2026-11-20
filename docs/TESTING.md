# Testing: expected vs actual, and what is NOT tested

All test texts are **synthetic**, written by Claude for testing. None are real calls. No real-user testing has been done.

## 1. Automated tests: `npm test`

Stubbed Sarvam, no network, no credits. **Result of the latest run: 110 tests, 110 pass, 0 fail** (`evals/results/unit-tests-run.txt`).

Covers: rule detection and false positives (single words, "never share your OTP", doorstep delivery OTP, official-channel reminders); AI merge guards (the AI cannot raise a verdict without a quote that exists in the text, one- or two-word quotes and very short texts cannot raise it, "very likely" needs real evidence, the AI finding nothing outvotes one thin keyword hit but never a firm phrase such as call merging, wrong-script explanation falls back); reading a model answer that is cut off or padded with blank lines; matching a slightly mis-copied quote to the user's own words; the rules added for the accuracy work (call merging, a code described without the word OTP, gift cards, payments put as an obligation, retellings, news and advice, a cab driver's PIN) and a guard that the rules on the development sets keep their false-alarm rate low; empty/invalid/too-long input; service failures (HTTP 500, 503, 429, 402, 401, 403, network failure, malformed model output) producing a labelled limited check; masking of long digit strings before they reach the AI; no "safe" verdict and no percentages; recording validation (empty, silent, too short, too long) **before** credits are spent; rate and daily limits; the server log containing no text, audio or IPs; WAV encoder against the server validator; Live Guard sessions (create, chunking, alert only goes up, caps, wipe on end/idle, viewer limits, bad-code limits, SSE refusal).

## 2. Eval cases: 68 synthetic cases through the real pipeline

Groups: scams in English, Hinglish and Hindi; genuine calls (delivery, bank, service, family, official); advice such as "never share your OTP"; single keywords alone; unclear/very short input; 29 differently worded variants (24, plus 5 speech-to-text-style ones added later).

| Mode | Command | Result file | Result |
|---|---|---|---|
| Limited (rules only, no AI) | `npm run eval` | `evals/results/limited.md` | 68/68 as expected; V07 is a **known limit** (a paraphrase the keyword rules cannot catch) and is counted as expected, not as a pass of the rules |
| Real Sarvam AI + rules | `npm run eval:live` | `evals/results/live.md` | **Latest run 68/68.** See history below |

**History of live runs (kept honest, the AI is not deterministic):**

1. First live run: **60/63.** Three false positives, where the AI called ordinary texts "some warning signs": G10 (police station asks the person to visit with documents), K03 (the bare words "OTP police bank urgent"), V20 (a police call asking the person to visit tomorrow with ID).
2. Fix: added a prompt line that an in-person visit/ID request with no demand or threat is normal; and two code guards (with no rule signal, an AI verdict is ignored for texts under 6 words, and ignored when all its quotes are only one or two words).
3. Second run: 62/63 (K04 flagged on the quotes "my OTP" and "police"); fixed by the one-or-two-word guard.
4. Two further runs: 63/63 each.

5. After parent-phone mode was added, five speech-to-text-style cases (V25 to V29: letter-by-letter "O T P", Hindi-script "ओ टी पी", "UPI PIN daliye" refund scam, a family chat, a retelling of a bank advisory) were written after probing the rules with such text. The probe found the rules missed "O T P" spelled with spaces and "PIN daliye"; both were fixed. Rules-only 68/68, live 68/68.
   - V29 ("the bank said not to tell anyone, so I told no one") is only passed because its expectation allows "some warning signs"; the app does flag the quoted phrase "kisi ko mat batana" in that retelling. That is a mild false positive and is not fixed.

**Known mild false positives (documented, not fixed):**

- **A genuine doorstep delivery OTP** (cases G05, G06, V14, V15, and a check on the live site on 2026-11-20): the rules alone say "no clear warning signs", but with the AI layer on, the result is **"some warning signs"** (never "very likely a scam"), because the app cannot confirm the person is really at the door. The eval expectation allows this on purpose. A reader may still see it as a false alarm.
- **Retelling a bank's advice** (V29): the quoted phrase "kisi ko mat batana" is flagged.

**Caveat:** the fixes were made after seeing these exact failures, so the pass rates above are not an unbiased accuracy measure. It shows the known failure modes are handled, not that the app is accurate on real calls. The case set was written by the same author as the rules (see `evals/results/limited-run1-before-fixes.md` for the first-run failures on the second set).

## 3. Real-service smoke tests (one run each, on 2026-11-20)

| Check | Expected | Actual |
|---|---|---|
| Text-to-speech (Hindi sentence) via `/api/speak` | 200 and audio | 200, `audio/mpeg`, ~200 KB. **Whether it sounds clear was not listened to.** |
| Speech-to-text of that audio converted to 16 kHz mono WAV via `/api/transcribe` | Hindi/English mix back | Transcript matched the sentence, with English words in Latin script |
| Live Guard session, two real ~6 s clips of that speech sent to `/api/live/chunk` | Alert rises from some warning signs to very likely a scam; highlights are exact substrings | Chunk 1: warning signs; chunk 2: very likely a scam, with highlights on "digital Arrest", "किसी को मत बताइए", "OTP बताइए" |
| Session end | Transcript and alert wiped | `latest.text` empty and `alert` null after end; only the final level remains |

The audio here is **clean computer-generated speech**, not a phone speaker in a room, so it says nothing about accuracy on real calls.

### Parent-phone ("solo") mode, in the development browser

Run against the fake Sarvam on localhost with a **synthetic tone as a fake microphone** (the browser pane has no real mic): `/listen` with no code showed the solo setup, tapping Start created a session, the page uploaded 8-second clips, and after about 24 seconds the full-screen "This call looks like a scam" warning appeared. Checked at phone width. This shows the page logic works; it says nothing about a real phone microphone, real calls or real speech.

## 4. Not tested (do not assume these work)

- **Live Guard on a real call**, on the parent's own phone on speaker (the main setup) or with a second device next to it. Many phones mute the microphone for apps during a call. Whether the other person's voice is heard is **unknown**.
- **Automatic start for numbers not in contacts:** not built. A web page cannot detect incoming calls or read contacts; it needs a native Android app.
- iOS: capturing call audio is not possible; background behaviour of the listener page when the screen locks is untested.
- Real microphone capture on real Android and iPhone browsers (the development browser blocks the mic; the encoder is unit-tested).
- Audible quality of read-aloud audio in Hindi. STT accuracy on real noisy, accented or compressed speakerphone audio: only 8 computer-voice clips were tried with a phone-and-room sound simulation (`docs/ACCURACY.md`).
- Hindi UI and explanation wording reviewed by a native speaker (written with AI help).
- Whether two different real visitors get separate rate-limit buckets on the host (the proxy headers were measured, see section 5, but only from one address).
- Scam-detection accuracy on real calls; false-positive rate on real calls. No percentages are claimed.

## 5. Deployment checks

Public URL: https://rakshak-u47o.onrender.com (Render free tier). Checked on 2026-11-20 with plain `curl` (no cookies, no login):

| Check | Expected | Actual |
|---|---|---|
| `/`, `/guard`, `/listen`, `/icon.svg` without logging in | 200 | 200 for all four |
| `/api/status` | AI enabled (key present on the server) | `"ai": true`; the key is not visible to the browser |
| One real `/api/check` on the public URL (synthetic digital-arrest text) | very likely a scam, with exact quotes | very likely a scam, source `ai`, highlights on "digital arrest", "Kisi ko mat batana", "OTP bata dijiye" |
| Security headers | CSP, nosniff, no-referrer | present |
| Which `X-Forwarded-For` entry is the real visitor? | measured, not guessed | Render sends 3 entries; the visitor's own address (compared with my public IP) is **3rd from the right**. Adding forged entries only lengthens the list on the left, so the 3rd from the right stays the real one. Set `TRUST_PROXY_HOPS=3` |
| After the parent-phone update: home page has the new card; a session created with no code, two real speech clips uploaded, then ended | alert rises to very likely a scam; text wiped at end | warning signs, then very likely a scam; `latest.text` empty after end |
| Stale browser cache after an update | New HTML never paired with old scripts | **Found a bug here:** the first deploys served scripts with a one-hour cache, and a browser that had kept them showed raw labels such as `soloTitle`. Fixed: files always revalidate and every script/style URL has a `?v=` tag (unit test `test/assets.test.js`). Re-checked on the live site afterwards, in the same browser that had the stale files: no raw labels on the home, family and parent pages in English or Hindi |
| QR code on the home page (wide screens only) | Reads back as the app's address | Read back as `https://rakshak-u47o.onrender.com` three ways: Apple's QR reader on the drawn symbol, Apple's QR reader on the rendered SVG file, and Chrome's built-in QR detector on the image as the page shows it. Hidden on a phone-sized screen; Hindi text shows. **Not tested: scanning it with a real phone camera.** |
| Per-visitor limit on the live host (10 wrong live-session codes per 10 minutes) | 11th request blocked | 404 x10, then 429; forged `X-Forwarded-For` headers did not get past it |

Not checked: that two different real visitors get separate buckets (I only had one address); behaviour with the service asleep for a long time other than a first-visit delay of up to about a minute; the app on real phones.

The proxy measurement used a temporary flag (`DEBUG_IP_DIAG`), now set to 0.

## 6. Cost caps (not measured spend)

Daily caps: 250 AI checks, 1200 seconds of speech-to-text, 8000 characters of read-aloud. These are caps, not measured spend; the real hard stop is the Sarvam credit balance. Check actual rates on Sarvam's pricing page before relying on any rupee figure.

## 7. Accuracy evaluation (added 2026-11-21)

A separate benchmark of four labelled sets of invented texts (206 development texts, two held-out sets of 110 and 98), a simulation of 13 whole calls through the Live Guard code, and an 8-clip speech check. Results, method and limits are in [`ACCURACY.md`](ACCURACY.md). Headline: on the held-out sets the app flagged 109 of 109 scam texts and 2 of 70 honest texts; the first version flagged 49 of 54 scam texts and 2 of 31 honest texts on held-out set B. The first version was not run on held-out set A. All texts are invented and nobody has tested a real call.
