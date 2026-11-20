// Simulates whole phone calls through the real Live Guard code (rolling transcript, when the AI is asked, the alert that
// only goes up). Speech recognition is replaced by the scripted text of each 8-second chunk, so no audio is paid for;
// the AI calls are real, cached and counted against the same spend cap as the other evaluations.
//   node evals/live-sim/run.js --live --budget 30
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, loadConfig } from '../../src/config.js';
import { createLimiter } from '../../src/limits.js';
import { createSarvam } from '../../src/sarvam.js';
import { createLive } from '../../src/live.js';
import { makeWav, RATE } from '../../src/wav.js';
import { Cache, Ledger, cachedSarvam } from '../acc/lib.js';
import { SCENARIOS } from './scenarios.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const evals = path.resolve(here, '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const live = argv.includes('--live');
const budget = Number(opt('budget', 30));
loadDotEnv();
if (live && !process.env.SARVAM_API_KEY) { console.error('SARVAM_API_KEY is not set. Nothing was called.'); process.exit(2); }

const cache = new Cache(path.join(evals, 'cache', 'chat.jsonl'));
const ledger = new Ledger(path.join(evals, 'cache', 'spend.json'), budget);
const real = live ? createSarvam({ apiKey: process.env.SARVAM_API_KEY, timeouts: { chat: 45000 } }) : null;
const cs = cachedSarvam({ real, cache, ledger, live });

let clock = Date.now();
const now = () => clock;
const cfg = loadConfig({ ...process.env, SARVAM_API_KEY: 'x' });
const limiter = createLimiter({ now, daily: cfg.daily });
const beep = makeWav(Int16Array.from({ length: RATE * 8 }, (_, i) => Math.round(8000 * Math.sin((2 * Math.PI * 220 * i) / RATE))));
const SEV = { none: 0, not_enough_info: 0, no_clear_signs: 0, warning_signs: 1, likely_scam: 2 };
const NAME = { 0: 'none', 1: 'warning', 2: 'VERY LIKELY' };

const rows = [];
for (const sc of SCENARIOS) {
  const queue = [...sc.chunks];
  let aiFailed = null;
  const sarvam = {
    stt: async () => ({ transcript: queue.shift() ?? '', languageCode: null }),
    chat: async (args) => { const s = cs.make(); try { return await s.chat(args); } catch (e) { aiFailed = s.last?.miss ? 'cache_miss' : (e.kind || 'error'); throw e; } },
  };
  const lv = createLive({ sarvam, limiter, cfg, now });
  const ip = `198.51.100.${rows.length + 1}`;
  const { code } = lv.create(sc.lang, ip);
  const trace = [];
  for (let i = 0; i < sc.chunks.length; i++) {
    await lv.ingest(code, beep, ip);
    clock += 8000;
    const st = lv.state(code, ip);
    trace.push(NAME[SEV[st.alertLevel] ?? 0]);
  }
  const st = lv.state(code, ip);
  const first = trace.findIndex((t) => t !== 'none');
  rows.push({ sc, trace, final: trace[trace.length - 1], firstAlertChunk: first < 0 ? null : first + 1, alertText: st.alert?.explanation ?? null, source: st.alert?.source ?? null, aiFailed });
  lv.end(code, ip);
}

const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };
say(`# Live Guard simulation · ${new Date().toISOString().slice(0, 16)}Z`);
say('');
say(`Whole calls fed chunk by chunk (8 s each) through the production Live Guard code; speech recognition replaced by the scripted text, the AI calls are real. Mode: ${live ? 'live (cache first)' : 'replay from cache only'} · cache hits ${cs.state.hits} · new calls ${cs.state.calls} · failures ${cs.state.failures}.`);
say(`Spend ledger (all runs, upper-bound prices): ₹${ledger.estRs.toFixed(2)} of ₹${budget} cap.`);
say('');
say('| call | kind | alert after each chunk | first alert at | final |');
say('|---|---|---|---|---|');
for (const r of rows) say(`| ${r.sc.id} ${r.sc.title} | ${r.sc.label} | ${r.trace.join(' → ')} | ${r.firstAlertChunk ? `chunk ${r.firstAlertChunk} (${r.firstAlertChunk * 8} s)` : '—'} | ${r.final}${r.aiFailed ? ` (AI ${r.aiFailed})` : ''} |`);
say('');
const gen = rows.filter((r) => r.sc.label === 'genuine');
const amb = rows.filter((r) => r.sc.label === 'ambiguous');
const sca = rows.filter((r) => r.sc.label === 'scam');
say(`Genuine calls with any alert: ${gen.filter((r) => r.final !== 'none').length}/${gen.length}. Ambiguous calls ending at "very likely": ${amb.filter((r) => r.final === 'VERY LIKELY').length}/${amb.length}. Scam calls alerted: ${sca.filter((r) => r.final !== 'none').length}/${sca.length}; reaching "very likely": ${sca.filter((r) => r.final === 'VERY LIKELY').length}/${sca.length}; first alert on average at chunk ${(sca.filter((r) => r.firstAlertChunk).reduce((a, r) => a + r.firstAlertChunk, 0) / Math.max(1, sca.filter((r) => r.firstAlertChunk).length)).toFixed(1)}.`);
fs.writeFileSync(path.join(evals, 'results', 'live-sim.md'), lines.join('\n') + '\n');
process.exit(0);
