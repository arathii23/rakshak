# Assumptions and what is verified

**No real-user interviews have been done yet.** Everything in the "Assumptions" table is an unverified guess.
This file is a worksheet: fill the right-hand column only with what a real person actually told you.

## Verified by testing (technical, in this repo)

| Claim | How it was checked |
|---|---|
| Rules do not flag single words like "OTP" or "police" | `test/rules.test.js`, eval group `keyword-alone` |
| Warnings not to share an OTP are not flagged | eval group `genuine-advisory`, rules tests |
| Doorstep delivery OTP is not flagged | eval group `genuine-delivery` |
| Every highlighted quote is an exact substring of the submitted text | asserted in every eval case and in unit tests |
| Empty/silent/too-short recordings are rejected before spending credits | `test/server.test.js` |
| Service failures produce a labelled limited check, not a crash or a silent wrong answer | `test/server.test.js` |

## Assumptions (unverified)

| # | Assumption | Why it matters | What a real person said (you fill this) |
|---|---|---|---|
| 1 | People who get suspicious calls can re-tell, or type, what the caller said soon after or during the call | The whole flow depends on it | |
| 2 | An older relative would use a simple link on their phone rather than ask a family member | Decides who the real user is | |
| 3 | A person under pressure on a call would open a web page at all | If not, the value is after-the-call checking | |
| 4 | Hindi / Hinglish typing or the keyboard's voice-typing key is comfortable for the target user | Input design | |
| 5 | The next steps given (hang up, call back on an official number, call 1930) are what the person would actually do | Usefulness of advice | |
| 6 | People would prefer this over simply asking a general chatbot or a family member | Core reason to exist | |
| 7 | A free tool with daily caps is acceptable to initial users | Product model | |
| 8 | A parent will agree to being listened to by their child's tool, and will open the app and tap Start when an unknown number calls | Live Guard depends on a deliberate tap; nothing starts automatically | |
| 9 | The child wants live alerts on their own phone during the call | Decides whether the family side is useful | |

## Not yet tested

- **Live Guard on a real call**, with the same phone on speaker and with a second device next to it. Whether the microphone hears the caller is unknown and device-dependent.
- Automatic start for numbers not in contacts: **not built** (not possible in a web app).
- iOS background behaviour of the listener page (the page may be throttled when the screen locks).
- Real microphone capture on real Android and iPhone browsers (the in-app browser used for development blocks the mic; the WAV encoder is unit-tested).
- Whether read-aloud audio is clear and natural in Hindi (generation is tested against a stub; audible quality is not).
- Accuracy of Sarvam speech-to-text on noisy speakerphone audio.
- The Hindi UI and explanation wording by a native Hindi speaker.
- Whether the proxy IP header on the hosting provider identifies individual users (see `docs/TESTING.md`).
