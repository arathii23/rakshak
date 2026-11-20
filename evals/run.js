// Runs every eval case through the REAL analysis pipeline and writes a results table.
//
//   node evals/run.js          → limited mode (rules only, no network)        [deterministic]
//   node evals/run.js --live   → full mode (rules + Sarvam AI), needs SARVAM_API_KEY in .env or env
//
// The live key is read by the server code from the environment; it is never printed or written.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES as BASE } from './cases.js';
import { VARIANTS } from './variants.js';
const CASES = [...BASE, ...VARIANTS];
import { analyze } from '../src/analyze.js';
import { createSarvam } from '../src/sarvam.js';
import { loadDotEnv } from '../src/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const live = process.argv.includes('--live');
loadDotEnv();

if (live && !process.env.SARVAM_API_KEY) {
  console.error('SARVAM_API_KEY is not set. Run scripts/set-key.sh first.');
  process.exit(2);
}
const sarvam = live ? createSarvam({ apiKey: process.env.SARVAM_API_KEY }) : null;
const arr = (x) => (Array.isArray(x) ? x : [x]);

const rows = [];
for (const c of CASES) {
  const t0 = Date.now();
  let r, error = null;
  try {
    r = await analyze({ text: c.text, lang: c.lang, sarvam, limitedReason: live ? null : 'eval_rules_only' });
  } catch (e) { error = e.message; }
  const allowed = arr(!live && c.expectRules ? c.expectRules : c.expect);
  const problems = [];
  if (error) problems.push(`threw: ${error}`);
  else {
    if (live && r.limited) problems.push(`AI call failed (${r.limitedReason}); got limited result`);
    if (!allowed.includes(r.verdict)) problems.push(`verdict ${r.verdict} not in [${allowed.join(', ')}]`);
    if (c.mustNotLikely && r.verdict === 'likely_scam') problems.push('must never be likely_scam');
    for (const q of c.mustHighlight || []) {
      if (!r.highlights.some((h) => h.text.toLowerCase().includes(q.toLowerCase()))) problems.push(`missing highlight "${q}"`);
    }
    for (const h of r.highlights) {
      if (!c.text.includes(h.text)) problems.push(`highlight not in text: "${h.text}"`);
    }
  }
  const knownLimit = !live && c.limitedKnownMiss && problems.length > 0;
  rows.push({ c, r, problems: knownLimit ? [] : problems, knownLimit, allowed, ms: Date.now() - t0 });
}

const pass = rows.filter((x) => x.problems.length === 0).length;
const mode = live ? 'LIVE (rules + Sarvam AI)' : 'LIMITED (rules only, no AI)';
let md = `# Eval results: ${mode}\n\n`;
md += `Run: ${new Date().toISOString()} · Cases: ${rows.length} · **Passed: ${pass}/${rows.length}**\n\n`;
md += `All case texts are synthetic (written by Claude for testing), not real calls.\n\n`;
md += `| ID | Group | Expected | Actual | Highlights | Result |\n|---|---|---|---|---|---|\n`;
for (const x of rows) {
  const hl = x.r ? x.r.highlights.map((h) => `“${h.text}”`).join(', ') || '—' : '—';
  md += `| ${x.c.id} | ${x.c.group} | ${x.allowed.join(' / ')} | ${x.r ? x.r.verdict : 'error'} | ${hl.replace(/\|/g, '\\|')} | ${x.knownLimit ? 'known limit (keyword rules cannot catch this; AI expected to)' : x.problems.length ? 'FAIL: ' + x.problems.join('; ') : 'pass'} |\n`;
}
const out = path.join(here, 'results', live ? 'live.md' : 'limited.md');
fs.writeFileSync(out, md);
console.log(md);
console.log(`\nWrote ${path.relative(process.cwd(), out)}`);
process.exit(pass === rows.length ? 0 : 1);
