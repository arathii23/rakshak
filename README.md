# Rakshak — Scam Call Assistant

**Live app (no login):** https://rakshak-u47o.onrender.com — runs on a free server that sleeps when idle, so the first visit can take up to a minute.

Check what a caller said. Type it, or record a short voice clip, in **Hindi, Hinglish or English**.
Rakshak points out the caller's **exact suspicious words**, explains in **Hindi or English**, and gives **one practical next step**.

**What it is not:** Rakshak does **not** run in the background, start by itself when a call arrives, record calls automatically, or block calls.
It only checks words you give it, or (in Live Guard) audio you deliberately start during a call. It cannot confirm whether a call is real, and "no clear warning signs" never means "safe".
There are no scam percentages anywhere.

> Built for a product case study. All example texts are synthetic and written for testing; none are real calls.

## How it works

1. Choose हिंदी or English (this sets the language of the explanation).
2. Type the caller's words, or tap **Speak instead**. A short recording is turned into text by Sarvam; you can read and fix the text before anything is checked.
3. Tap **Check**. Two layers run:
   - **Rules** (`src/rules.js`) find specific demands and threats in Hindi script, Roman Hinglish and English (asking for an OTP/PIN, money, an app install, threats of arrest or blocking, secrecy). A single word like "OTP" or "police" is never a warning sign by itself. "Never share your OTP" and a delivery person at your door are recognised as normal.
   - **Sarvam AI** (`sarvam-105b-conversations`) judges the whole text and quotes the words that matter. Every quote must appear exactly in your text or it is dropped. The AI can never declare "very likely a scam" unless a rule also found a signal, and it can never lower a verdict the rules found.
4. You see the verdict, the highlighted words, a short explanation, and one next step. **Read aloud** speaks it (Sarvam text-to-speech).
5. Recent checks are saved **only on your device** (localStorage), with delete buttons.

If Sarvam is down, out of credit, slow, or a limit is hit, you get a clearly labelled **Limited check** (rules only) with the reason. Typing always works.

### Live Guard (checking a call while it happens)

The main setup is **on the parent's own phone**. A family member can optionally watch alerts too.

1. When an unknown number calls, the parent opens Rakshak (`/listen`), ticks that they understand the microphone will listen, and taps **Start listening**. Then they put the call on speaker. They have to tap Start themselves.
2. The page sends ~8-second audio clips to the server. Sarvam turns them into text, the rules (and, on some clips, the AI) check the rolling transcript, and the alert level only ever goes **up** during a call.
3. The parent's screen shows a full-screen warning with beeps and vibration, and a spoken warning for "very likely a scam".
4. Optional: the parent taps "Send watch link on WhatsApp"; a family member opens `/guard#CODE` and sees the same alerts, highlighted words and next step live. A family member can also start from `/guard`, create a code, and send the parent a `/listen#CODE` link (this is also the route for a second device next to the phone).
5. Everything is held in server memory only. A session is wiped when it ends, after 15 minutes without audio, or after 45 minutes. Nothing is saved or logged.

**What this needs and what is not possible (honest limits):**

- A web page **cannot** detect an incoming call, check whether the number is in the contacts, or start by itself, so "turn on automatically for numbers not in contacts" is **not built**. It would need a native Android app and is listed as future work.
- A phone usually cannot record the other person during a normal call; many phones mute the microphone for apps. Using the **same phone** on speaker is therefore **untested on real calls**. If the sound bar does not move while the caller talks, that phone cannot hear the call; a second device next to the phone is the fallback, and it has also not been tried on a real call.
- iOS cannot capture call audio at all.
- Limits: 15 minutes of speech per session, 20 live sessions at once, 4 new sessions per hour per person.

## Run locally

Needs Node 20+. There are no npm dependencies.

```bash
./scripts/set-key.sh     # prompts for your Sarvam key, hidden; writes the git-ignored .env
npm start                # http://localhost:8787
```

Without a key the app still runs in limited (rules-only) mode.

## Keeping the Sarvam key safe

- **Locally:** `scripts/set-key.sh` writes `.env` (owner-only permissions, listed in `.gitignore`). Never paste the key into chat, code, or the browser.
- **In production (Render):** Dashboard → your service → **Environment** → add `SARVAM_API_KEY`. The key lives only on the server; the browser never sees it.
- The server logs only `METHOD /path status time`. No text, audio, headers or IPs. Tests check this.
- If a key is ever exposed, revoke it in the Sarvam dashboard and create a new one.

## Usage limits (protect your credits)

| Limit | Default | Env var |
|---|---|---|
| AI checks per day (all users) | 250 | `DAILY_AI_CHECKS` |
| Voice seconds per day | 1200 | `DAILY_STT_SECONDS` |
| Read-aloud characters per day | 8000 | `DAILY_TTS_CHARS` |
| AI checks per person | 10 per 10 min, 40 per day | `IP_CHECKS_PER_10MIN`, `IP_CHECKS_PER_DAY` |
| Recordings per person | 5 per 10 min | `IP_STT_PER_10MIN` |
| Read-aloud per person | 6 per 10 min | `IP_TTS_PER_10MIN` |
| Recording length | 20 s | `MAX_AUDIO_SECONDS` |
| Text length | 1000 characters | `MAX_TEXT_CHARS` |

Empty, silent or too-short recordings are rejected **before** any credit is spent. Counters are in memory and reset when the server restarts (Render's free tier sleeps when idle), so the real hard stop is your Sarvam credit balance. The daily caps bound the spend, but the rupee cost has not been measured; check Sarvam's pricing page.

## Tests

```bash
npm test          # unit + integration tests (stubbed Sarvam, no network, no credits)
npm run eval      # eval cases through the pipeline in limited (rules-only) mode
npm run eval:live # same cases with the real Sarvam AI (needs the key; spends a few paise)
```

Results and known limitations: [`docs/TESTING.md`](docs/TESTING.md). Unverified assumptions: [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md).

## Deploy (Render free tier)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo (it reads `render.yaml`).
3. When asked, type `SARVAM_API_KEY` into Render's dashboard.
4. `render.yaml` sets `TRUST_PROXY_HOPS=3`, measured on Render (the visitor's address is 3rd from the right in `X-Forwarded-For`). On another host, measure it again.
5. Open the `onrender.com` URL. The first visit after idle can take about a minute (free tier wakes up).

### QR code on the home page

On wide screens the home page shows a QR code that opens the app on a phone (it is hidden on phones). It is the file `public/qr.svg`, made once with Apple's built-in QR generator and checked by reading it back:

```bash
swift scripts/make-qr.swift make https://your-app-address public/qr.svg   # macOS only, no downloads
```

If the app's address changes, run that again. The running app only serves the finished file.

## Credits

- **Author:** arathii23
- **AI contributor:** Claude (Anthropic) helped write code, tests and docs. Commits where Claude helped carry a `Co-Authored-By` trailer. The case-study write-up is written by the author, not by AI.
- **Earlier work:** Kavach, an earlier prototype by the same author (published under a different GitHub account), was used as a reference for ideas. No code was copied from it; the code in this repository was written fresh.
- **Speech and language:** [Sarvam AI](https://www.sarvam.ai/) APIs (speech-to-text, chat, text-to-speech).

## Known limitations

See `docs/TESTING.md`. In short: Hindi wording was written with AI help and needs review by a native speaker; the keyword rules are tuned on synthetic examples and can miss paraphrases; real-microphone capture, Live Guard on a real call (same phone or second device) and audible read-aloud must be tried on real phones; no real-user interviews have been done.
