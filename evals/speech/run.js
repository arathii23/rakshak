// Speech check: invented calls are read by a computer voice, made to sound like a call heard from a speakerphone
// (phone-line band, room echo, background noise), cut into 8-second chunks like the app does, transcribed by Sarvam
// speech-to-text, and checked by the app's detector. This is a small smoke test, not an accuracy measurement.
//   node evals/speech/run.js --live --budget 30 [--snr 12] [--rt60 0.35]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from '../../src/config.js';
import { createSarvam } from '../../src/sarvam.js';
import { analyze } from '../../src/analyze.js';
import { inspectWav, makeWav, RATE } from '../../src/wav.js';
import { Cache, Ledger, cachedSarvam, PRICE } from '../acc/lib.js';
import { CLIPS } from './clips.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const evals = path.resolve(here, '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const live = argv.includes('--live');
const budget = Number(opt('budget', 30));
const snr = Number(opt('snr', 12));
const rt60 = Number(opt('rt60', 0.35));
const only = opt('ids', null)?.split(',');
loadDotEnv();
if (live && !process.env.SARVAM_API_KEY) { console.error('SARVAM_API_KEY is not set. Nothing was called.'); process.exit(2); }

const audioDir = path.join(here, 'audio');
fs.mkdirSync(audioDir, { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });

function ensureAudio(c) {
  const clean = path.join(audioDir, `${c.id}-clean.wav`), noisy = path.join(audioDir, `${c.id}-noisy.wav`), aiff = path.join(audioDir, `${c.id}.aiff`);
  if (!fs.existsSync(noisy)) {
    run('say', ['-v', c.voice, '-o', aiff, '--', c.text]);
    run('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, clean]);
    run('python3', ['-I', path.join(here, 'degrade.py'), clean, noisy, String(snr), String(rt60), String(c.id.charCodeAt(1))]);
    fs.rmSync(aiff, { force: true });
  }
  return noisy;
}

/** Same chunking as the app's recorder: 8 s pieces; a leftover shorter than 1.5 s is joined to the piece before it. */
function chunks(wavBuf) {
  const d = wavBuf.subarray(44), n = d.length / 2, per = RATE * 8;
  const cuts = [];
  for (let s = 0; s < n; s += per) cuts.push([s, Math.min(n, s + per)]);
  if (cuts.length > 1 && cuts[cuts.length - 1][1] - cuts[cuts.length - 1][0] < RATE * 1.5) { const last = cuts.pop(); cuts[cuts.length - 1][1] = last[1]; }
  return cuts.map(([s, e]) => makeWav(Int16Array.from({ length: e - s }, (_, i) => d.readInt16LE((s + i) * 2))));
}

const norm = (t) => String(t).toLowerCase().normalize('NFC').replace(/[\p{P}\p{S}]/gu, ' ').split(/\s+/).filter(Boolean);
const script = (t) => (/[ऀ-ॿ]/.test(t) ? 'dev' : 'lat');
function wer(ref, hyp) {
  const a = norm(ref), b = norm(hyp);
  if (!a.length) return null;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / a.length;
}

const cache = new Cache(path.join(evals, 'cache', 'chat.jsonl'));
const ledger = new Ledger(path.join(evals, 'cache', 'spend.json'), budget);
const real = live ? createSarvam({ apiKey: process.env.SARVAM_API_KEY, timeouts: { chat: 45000, stt: 40000 } }) : null;
const cs = cachedSarvam({ real, cache, ledger, live });
const sarvamForAnalyze = { chat: (args) => cs.make().chat(args) };

const rows = [];
for (const c of CLIPS.filter((x) => !only || only.includes(x.id))) {
  const wav = fs.readFileSync(ensureAudio(c));
  const pieces = chunks(wav);
  const seconds = (wav.length - 44) / 2 / RATE;
  const heard = [];
  let sttNote = null;
  if (live) {
    for (const p of pieces) {
      const info = inspectWav(p, 20);
      if (!info.ok) { sttNote = info.code; continue; }
      if (ledger.headroom() < (info.seconds / 60) * PRICE.sttPerMin + 0.1) { sttNote = 'budget'; break; }
      try { const r = await real.stt(p); ledger.add({ sttSeconds: info.seconds }, true); heard.push(r.transcript); } catch (e) { sttNote = e.kind || 'error'; }
    }
  }
  const transcript = heard.join(' ').trim();
  let verdict = null, source = null;
  if (transcript) { const r = await analyze({ text: transcript, lang: 'en', sarvam: sarvamForAnalyze }); verdict = r.verdict; source = r.limited ? `limited:${r.limitedReason}` : 'ai'; }
  const refText = c.text;
  rows.push({ c, seconds, chunks: pieces.length, transcript, verdict, source, sttNote, wer: transcript && script(refText) === script(transcript) ? wer(refText, transcript) : null });
}

const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };
say(`# Speech check · ${new Date().toISOString().slice(0, 16)}Z`);
say('');
say(`Invented calls read by a computer voice, made to sound like a speakerphone in a room (8 kHz phone-line band, room echo ${rt60} s, background noise ${snr} dB below the voice), cut into 8-second chunks, transcribed by Sarvam, then checked by the app. Mode: ${live ? 'live' : 'audio only, nothing sent'} · spend ledger ₹${ledger.estRs.toFixed(2)} of ₹${budget} (upper-bound prices).`);
say('');
say('| clip | kind | lang | seconds | transcript (what the app would see) | word error | verdict |');
say('|---|---|---|---|---|---|---|');
for (const r of rows) say(`| ${r.c.id} | ${r.c.label} | ${r.c.lang} | ${r.seconds.toFixed(1)} | ${r.transcript ? r.transcript.replace(/\|/g, '/') : `(none${r.sttNote ? `: ${r.sttNote}` : ''})`} | ${r.wer == null ? 'n/a' : `${(r.wer * 100).toFixed(0)}%`} | ${r.verdict ?? '—'}${r.source && r.source !== 'ai' ? ` (${r.source})` : ''} |`);
say('');
const scams = rows.filter((r) => r.c.label === 'scam' && r.verdict), gen = rows.filter((r) => r.c.label === 'genuine' && r.verdict);
say(`Scam calls flagged: ${scams.filter((r) => ['warning_signs', 'likely_scam'].includes(r.verdict)).length}/${scams.length}. Genuine calls flagged: ${gen.filter((r) => ['warning_signs', 'likely_scam'].includes(r.verdict)).length}/${gen.length}. Eight clips say very little; this shows the pipeline survives noisy speech, nothing more. Word error is shown only where the transcript uses the same script as the text that was read out.`);
if (live) fs.writeFileSync(path.join(evals, 'results', 'speech-check.md'), lines.join('\n') + '\n');
process.exit(0);
