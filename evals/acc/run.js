// Accuracy evaluation on a labelled set. Compares, on identical inputs and identical cached model answers:
//   rules-<engine>  keyword rules only            ai-<engine>  the model's own verdict only, no rules, no guards
//   hybrid-<engine> what the app really returns   (engine v1 = frozen copy of the first detector, v2 = current src/)
//
//   node evals/acc/run.js --set dev --configs rules-v1,ai-v1,hybrid-v1            replay from cache only (free; misses are reported)
//   node evals/acc/run.js --set dev --configs hybrid-v2 --live --budget 25        call Sarvam for cache misses, stop at the cap
//
// Test sets (test-*) print aggregate numbers only unless --reveal is given. Look at individual test errors only
// after the detector is frozen. The API key is read from .env or the environment and never printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from '../../src/config.js';
import { createSarvam } from '../../src/sarvam.js';
import { Cache, Ledger, cachedSarvam, pool, score, fmtRate, FLAGGED, PRICE } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const evals = path.resolve(here, '..');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1]?.startsWith('--') ? true : argv[i + 1] ?? true) : dflt; };
const setName = String(opt('set', 'dev'));
const configs = String(opt('configs', 'rules-v1,ai-v1,hybrid-v1')).split(',').map((s) => s.trim()).filter(Boolean);
const live = argv.includes('--live');
const reveal = argv.includes('--reveal') || !setName.startsWith('test');
const budget = Number(opt('budget', 25));
const concurrency = Number(opt('concurrency', 3));
const tag = String(opt('tag', 'run'));
const limit = Number(opt('limit', 0));
const onlyIds = opt('ids', null) ? String(opt('ids')).split(',') : null;

loadDotEnv();
if (live && !process.env.SARVAM_API_KEY) { console.error('SARVAM_API_KEY is not set (run scripts/set-key.sh). Nothing was called.'); process.exit(2); }

async function loadOne(name) {
  if (name === 'dev') return (await import('../data/dev.js')).DEV;
  if (name === 'dev2') return (await import('../data/dev2.js')).DEV2;
  if (name === 'test-a') return (await import('../data/test-a.js')).TEST_A;
  if (name === 'test-b') return JSON.parse(fs.readFileSync(path.join(evals, 'data', 'test-b.json'), 'utf8')).cases;
  throw new Error(`unknown set ${name}`);
}
// "dev,dev2" runs both development sets together; test sets are never mixed with them.
async function loadSet(name) {
  const parts = name.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1 && parts.some((p) => p.startsWith('test'))) throw new Error('test sets are run on their own');
  return (await Promise.all(parts.map(loadOne))).flat();
}
let cases = await loadSet(setName);
if (onlyIds) cases = cases.filter((c) => onlyIds.includes(c.id));
if (limit) cases = cases.slice(0, limit);

const ENGINES = { v1: () => import('../baseline-v1/analyze.js'), v2: () => import('../../src/analyze.js') };
const parsed = configs.map((c) => { const [mode, engine] = c.split('-'); if (!['rules', 'ai', 'hybrid'].includes(mode) || !ENGINES[engine]) throw new Error(`bad config ${c}`); return { name: c, mode, engine }; });
const engineNames = [...new Set(parsed.map((p) => p.engine))];
const engines = Object.fromEntries(await Promise.all(engineNames.map(async (e) => [e, await ENGINES[e]()])));

fs.mkdirSync(path.join(evals, 'cache'), { recursive: true });
const cache = new Cache(path.join(evals, 'cache', 'chat.jsonl'));
const ledger = new Ledger(path.join(evals, 'cache', 'spend.json'), budget);
const real = live ? createSarvam({ apiKey: process.env.SARVAM_API_KEY, timeouts: { chat: 45000 } }) : null;
const cs = cachedSarvam({ real, cache, ledger, live });

const aiOnly = (eng, content) => {
  if (typeof eng.aiOnlyVerdict === 'function') return eng.aiOnlyVerdict(content);
  try { return JSON.parse(String(content).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '')).verdict ?? null; } catch { return null; }
};

const results = Object.fromEntries(parsed.map((p) => [p.name, new Map()])); // config → id → { verdict, problem, hl }
const needAi = (engine) => parsed.some((p) => p.engine === engine && p.mode !== 'rules');
let violations = 0;

if (live) {
  const uncached = cases.length; // upper bound: the cache is consulted per call
  console.log(`live mode: up to ${uncached} calls per AI engine; cap ₹${budget} (already used ₹${ledger.estRs.toFixed(3)}); upper-bound prices ₹${PRICE.inPerM}/₹${PRICE.outPerM} per million tokens`);
}

await pool(cases, concurrency, async (c) => {
  for (const engine of engineNames) {
    const eng = engines[engine];
    const want = parsed.filter((p) => p.engine === engine);
    if (want.some((p) => p.mode === 'rules')) {
      const r = await eng.analyze({ text: c.text, lang: 'en', sarvam: null, limitedReason: 'eval_rules_only' });
      results[`rules-${engine}`]?.set(c.id, { verdict: r.verdict });
    }
    if (needAi(engine)) {
      const sv = cs.make();
      const r = await eng.analyze({ text: c.text, lang: 'en', sarvam: sv, limitedReason: null });
      const early = !sv.last && !r.limited; // too short for the AI: the app answers without calling it
      const problem = r.limited ? (sv.last?.miss ? 'cache_miss' : sv.last?.budget ? 'budget' : sv.last?.fatal ? `fatal_${sv.last.fatal}` : `ai_${sv.last?.failed ?? r.limitedReason ?? 'failed'}`) : null;
      for (const h of r.highlights || []) if (!c.text.includes(h.text)) violations++;
      if (want.some((p) => p.mode === 'hybrid')) results[`hybrid-${engine}`].set(c.id, { verdict: problem ? null : r.verdict, problem, hl: (r.highlights || []).map((h) => h.text) });
      if (want.some((p) => p.mode === 'ai')) {
        const v = early ? r.verdict : sv.last?.content ? aiOnly(eng, sv.last.content) : null;
        results[`ai-${engine}`].set(c.id, { verdict: v ?? null, problem: v ? null : (problem || 'unparsed') });
      }
    }
  }
});

// ---------------- report ----------------
const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };
say(`# Accuracy: ${setName} (${cases.length} cases) · tag ${tag} · ${new Date().toISOString().slice(0, 16)}Z`);
say('');
say(`Mode: ${live ? 'live (cache first, then Sarvam)' : 'replay from cache only'} · cache hits ${cs.state.hits} · new calls ${cs.state.calls} · retries ${cs.state.retries} · failures ${cs.state.failures}${cs.state.budgetStop ? ' · STOPPED AT BUDGET' : ''}${cs.state.fatal ? ` · STOPPED: ${cs.state.fatal}` : ''}`);
say(`Spend ledger (all runs, upper-bound prices): ₹${ledger.estRs.toFixed(2)} of ₹${budget} cap · ${ledger.d.calls} calls · ${ledger.d.promptTokens} prompt + ${ledger.d.completionTokens} completion tokens`);
say(`Texts are synthetic. Labels: scam / genuine / ambiguous (see evals/data/*.js). A verdict of "some warning signs" or "very likely a scam" counts as flagged. Highlights outside the submitted text: ${violations}.`);
say('');

let anyMissing = 0;
const summary = [];
for (const p of parsed) {
  const map = results[p.name];
  const rows = [];
  const missing = [];
  for (const c of cases) {
    const r = map.get(c.id);
    if (!r || !r.verdict) missing.push({ c, problem: r?.problem || 'none' }); else rows.push({ c, verdict: r.verdict, hl: r.hl });
  }
  anyMissing += missing.length;
  const s = score(rows);
  summary.push({ name: p.name, s, missing: missing.length });
  say(`## ${p.name}${missing.length ? ` — ${missing.length} cases had no answer (${[...new Set(missing.map((m) => m.problem))].join(', ')}); numbers cover the rest` : ''}`);
  say('');
  say(`- Scams flagged (recall): **${fmtRate(s.scam.flagged, s.scam.n)}**; called "very likely a scam": ${fmtRate(s.scam.likely, s.scam.n)}`);
  say(`- Genuine texts flagged (false alarms): **${fmtRate(s.genuine.flagged, s.genuine.n)}**; of which "very likely a scam": ${s.genuine.likely}`);
  say(`- Ambiguous texts flagged: ${s.ambiguous.flagged}/${s.ambiguous.n}; "very likely a scam" on genuine or ambiguous (severe errors): **${s.severe}**`);
  say(`- Precision ${(s.precision * 100).toFixed(1)}% · F1 ${(s.f1 * 100).toFixed(1)}% (genuine texts count as the negatives; ambiguous ones are left out)`);
  say('');
  say('| label | ' + ['likely_scam', 'warning_signs', 'no_clear_signs', 'not_enough_info'].join(' | ') + ' |');
  say('|---|---|---|---|---|');
  for (const l of ['scam', 'genuine', 'ambiguous']) say(`| ${l} | ${['likely_scam', 'warning_signs', 'no_clear_signs', 'not_enough_info'].map((v) => s.confusion[l]?.[v] || 0).join(' | ')} |`);
  say('');
  if (reveal) {
    const missed = rows.filter((r) => r.c.label === 'scam' && !FLAGGED.has(r.verdict));
    const falseAlarm = rows.filter((r) => r.c.label === 'genuine' && FLAGGED.has(r.verdict));
    const severe = rows.filter((r) => r.c.label !== 'scam' && r.verdict === 'likely_scam');
    say(`Missed scams (${missed.length}): ${missed.map((r) => `${r.c.id}[${r.c.typ}→${r.verdict}]`).join(', ') || 'none'}`);
    say(`False alarms (${falseAlarm.length}): ${falseAlarm.map((r) => `${r.c.id}[${r.c.typ}→${r.verdict}]`).join(', ') || 'none'}`);
    say(`Severe (very likely a scam on a non-scam, ${severe.length}): ${severe.map((r) => r.c.id).join(', ') || 'none'}`);
    say('');
  }
}

// comparison table
say('## Side by side');
say('');
say('| config | scams flagged | very likely (of scams) | genuine flagged | severe | precision | F1 | no answer |');
say('|---|---|---|---|---|---|---|---|');
for (const x of summary) {
  const { s } = x;
  say(`| ${x.name} | ${fmtRate(s.scam.flagged, s.scam.n)} | ${(100 * s.scam.likely / Math.max(1, s.scam.n)).toFixed(0)}% | ${fmtRate(s.genuine.flagged, s.genuine.n)} | ${s.severe} | ${(s.precision * 100).toFixed(1)}% | ${(s.f1 * 100).toFixed(1)}% | ${x.missing} |`);
}
say('');
const best = summary.find((x) => x.name.startsWith('hybrid')) || summary[summary.length - 1];
if (best) {
  say(`## Recall by scam type (${best.name})`);
  say('');
  say('| type | n | flagged | very likely |');
  say('|---|---|---|---|');
  for (const [t, v] of Object.entries(best.s.typ).sort((a, b) => a[1].flagged / a[1].n - b[1].flagged / b[1].n || b[1].n - a[1].n)) say(`| ${t} | ${v.n} | ${v.flagged} | ${v.likely} |`);
  say('');
  say(`## By language and style (${best.name})`);
  say('');
  say('| slice | scams flagged | genuine flagged |');
  say('|---|---|---|');
  for (const [k, v] of Object.entries(best.s.byLang)) say(`| lang ${k} | ${v.scamFlag}/${v.scamN} | ${v.genFlag}/${v.genN} |`);
  for (const [k, v] of Object.entries(best.s.byStyle)) say(`| style ${k} | ${v.scamFlag}/${v.scamN} | ${v.genFlag}/${v.genN} |`);
  say('');
}

const out = path.join(evals, 'results', `accuracy-${setName.replace(/,/g, '+')}-${tag}.md`);
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(`\nWrote ${path.relative(process.cwd(), out)}`);
process.exit(anyMissing ? 3 : 0);
