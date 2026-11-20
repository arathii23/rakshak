// Shows, case by case, what the rules and the model said and which merge step decided the result.
// Development set only (a test set needs --reveal, and should only be opened once the detector is frozen).
//   node evals/acc/inspect.js --engine v1 --filter errors      (errors | disagree | all | ids D001,D002)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Cache, Ledger, cachedSarvam, FLAGGED } from './lib.js';

const evals = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const setName = opt('set', 'dev');
if (setName.startsWith('test') && !argv.includes('--reveal')) { console.error('Test sets are not inspected until the detector is frozen. Use --reveal if that time has come.'); process.exit(2); }
const engineName = opt('engine', 'v2');
const filter = opt('filter', 'errors');
const eng = await (engineName === 'v1' ? import('../baseline-v1/analyze.js') : import('../../src/analyze.js'));
const rulesMod = await (engineName === 'v1' ? import('../baseline-v1/rules.js') : import('../../src/rules.js'));
const loadOne = async (n) => n === 'dev' ? (await import('../data/dev.js')).DEV : n === 'dev2' ? (await import('../data/dev2.js')).DEV2 : n === 'test-a' ? (await import('../data/test-a.js')).TEST_A : JSON.parse(fs.readFileSync(path.join(evals, 'data', 'test-b.json'), 'utf8')).cases;
const cases = (await Promise.all(setName.split(',').map(loadOne))).flat();
const cache = new Cache(path.join(evals, 'cache', 'chat.jsonl'));
const cs = cachedSarvam({ real: null, cache, ledger: new Ledger(path.join(evals, 'cache', 'spend.json'), 0), live: false });
const ids = /^(D|E|T)\d/.test(filter) ? filter.split(',') : null;
const maxLen = Number(opt('len', 220));
let shown = 0;
for (const c of cases) {
  if (ids && !ids.includes(c.id)) continue;
  const rr = rulesMod.runRules(c.text);
  const rv = rulesMod.rulesVerdict(rr, c.text);
  const sv = cs.make();
  const r = await eng.analyze({ text: c.text, lang: 'en', sarvam: sv, limitedReason: null });
  let ai = null;
  try { ai = sv.last?.content ? JSON.parse(String(sv.last.content).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '')) : null; } catch { ai = { bad: true }; }
  const flagged = FLAGGED.has(r.verdict);
  const wrong = (c.label === 'scam' && !flagged) || (c.label === 'genuine' && flagged) || (c.label !== 'scam' && r.verdict === 'likely_scam');
  const disagree = FLAGGED.has(rv) !== FLAGGED.has(ai?.verdict) || (rv === 'likely_scam') !== (ai?.verdict === 'likely_scam');
  const pick = filter === 'all' || ids || (filter === 'errors' && wrong) || (filter === 'disagree' && disagree);
  if (!pick) continue;
  shown++;
  console.log(`\n${c.id} [${c.label}/${c.typ}/${c.lang}/${c.style}] hybrid=${r.verdict}${wrong ? '  <-- WRONG' : ''}`);
  console.log(`  text : ${c.text.replace(/\s+/g, ' ').slice(0, maxLen)}${c.text.length > maxLen ? '…' : ''}`);
  console.log(`  rules: ${rv} score=${rr.score} [${rr.signals.filter((s) => s.kind === 'strong').map((s) => `${s.id}:"${s.text}"`).join(' | ')}]${rr.flags.advisory ? ' (advisory seen)' : ''}${rr.flags.doorstep ? ' (doorstep seen)' : ''}`);
  if (!ai) console.log(`  ai   : (no answer: ${JSON.stringify(sv.last)})`);
  else if (ai.bad) console.log(`  ai   : (unparseable) ${String(sv.last.content).slice(0, 160)}`);
  else console.log(`  ai   : ${ai.verdict} quotes=${(ai.quotes || []).map((q) => `"${String(q.quote).slice(0, 50)}"${c.text.includes(q.quote) ? '' : '(NOT FOUND)'}`).join(' | ')}\n         ${String(ai.explanation || '').slice(0, 160)}`);
}
console.log(`\n${shown} cases shown`);
