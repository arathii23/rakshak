# Rakshak — Scam Call Assistant

Check what a caller said. Type it, or record a short voice clip, in **Hindi, Hinglish or English**.
Rakshak points out the caller's **exact suspicious words**, explains in **Hindi or English**, and gives **one practical next step**.

**What it is not:** Rakshak does **not** listen to calls, record calls automatically, run in the background, or block calls.
It only checks words you give it. It cannot confirm whether a call is real, and "no clear warning signs" never means "safe".
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

### Speakerphone and the same phone

A phone cannot record the other person while a call is in progress (Android and iOS give the call audio priority over browser microphones). To record a call on speaker, use a **second device** next to the speaker. Rakshak says this before you record.

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

Empty, silent or too-short recordings are rejected **before** any credit is spent. Counters are in memory and reset when the server restarts (Render's free tier sleeps when idle), so the real hard stop is your Sarvam credit balance. Worst case at default caps is a few tens of rupees per day (see `docs/TESTING.md` for the arithmetic).

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
4. Open the `onrender.com` URL. The first visit after idle can take about a minute (free tier wakes up).

## Credits

- **Author:** arathii23
- **AI contributor:** Claude (Anthropic) helped write code, tests and docs. Commits where Claude helped carry a `Co-Authored-By` trailer. The case-study write-up is written by the author, not by AI.
- **Reference only:** [Kavach](https://github.com/cybergeniee/kavach) (live scam-call monitoring) was reviewed for ideas such as false-positive guardrails. No Kavach code was copied; this project's code is written fresh.
- **Speech and language:** [Sarvam AI](https://www.sarvam.ai/) APIs (speech-to-text, chat, text-to-speech).

## Known limitations

See `docs/TESTING.md`. In short: Hindi wording was written with AI help and needs review by a native speaker; the keyword rules are tuned on synthetic examples and can miss paraphrases; real-microphone capture and audible read-aloud must be tried on a real phone; no real-user interviews have been done.
