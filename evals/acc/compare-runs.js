// Compare two draws of the same texts (files written by `run.js --dump`): when the identical request is asked again,
// how often does a text get a different verdict? Prints verdicts and ids only, never the texts themselves.
//
//   node evals/acc/compare-runs.js --a draw0-test-a.json,draw0-test-b.json --b draw1-test-a.json,draw1-test-b.json \
//        [--out evals/results/variation.md]
import fs from 'node:fs';
import path from 'node:path';
import { Ledger, compareRuns, fmtRate, score } from './lib.js';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : dflt; };
const read = (list) => String(list).split(',').map((f) => JSON.parse(fs.readFileSync(path.resolve(f.trim()), 'utf8')));

if (!opt('a') || !opt('b')) { console.error('usage: node evals/acc/compare-runs.js --a <dumps> --b <dumps> [--out file.md]'); process.exit(2); }
const A = read(opt('a'));
const B = read(opt('b'));
if (A.length !== B.length) throw new Error('give the same number of files to --a and --b');
A.forEach((d, i) => { if (d.set !== B[i].set) throw new Error(`file ${i + 1}: ${d.set} is compared with ${B[i].set}`); });

const sets = A.map((d) => d.set);
const configs = Object.keys(A[0].configs).filter((c) => A.every((d) => d.configs[c]) && B.every((d) => d.configs[c]));
const rowsOf = (dumps, cfg) => dumps.flatMap((d) => d.configs[cfg]);
const pct = (k, n) => (n ? `${((100 * k) / n).toFixed(1)}%` : 'n/a');

const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };

// What the second draw cost, from the token counts saved with each answer (upper-bound prices).
const costRows = rowsOf(B, configs[0]).filter((r) => r.p != null);
const cost = Ledger.cost({ promptTokens: costRows.reduce((s, r) => s + r.p, 0), completionTokens: costRows.reduce((s, r) => s + (r.c || 0), 0) });

say('# Run-to-run variation: the same texts, the same request, answered twice');
say('');
say(`Sets: ${sets.join(' + ')} · first draw = the saved original answers (sample ${A[0].sample}), second draw = sample ${B[0].sample} (a new answer to the identical request) · ${new Date().toLocaleDateString('en-CA')}`);
say(`The second draw is ${costRows.length} model calls, about ₹${cost.toFixed(2)} at the highest prices seen (the pricing pages say less). The texts are invented. This prints verdicts and ids only.`);
say('');

for (const cfg of configs) {
  const ra = rowsOf(A, cfg), rb = rowsOf(B, cfg);
  const sa = score(ra.filter((r) => r.verdict).map((r) => ({ c: r, verdict: r.verdict })));
  const sb = score(rb.filter((r) => r.verdict).map((r) => ({ c: r, verdict: r.verdict })));
  const cmp = compareRuns(ra, rb);
  const noAnswer = ra.filter((r) => !r.verdict).length + rb.filter((r) => !r.verdict).length;
  say(`## ${cfg}${cfg.startsWith('hybrid') ? ' (what the app returns)' : cfg.startsWith('ai') ? " (the model's own verdict, before the rules and guards)" : ''}`);
  say('');
  if (noAnswer) say(`**${noAnswer} answers are missing** (budget stop or errors); only texts answered in both draws are compared (${cmp.n} of ${ra.length}).`);
  say('| | first draw | second draw |');
  say('|---|---|---|');
  say(`| scams flagged | ${fmtRate(sa.scam.flagged, sa.scam.n)} | ${fmtRate(sb.scam.flagged, sb.scam.n)} |`);
  say(`| scams called "very likely" | ${pct(sa.scam.likely, sa.scam.n)} | ${pct(sb.scam.likely, sb.scam.n)} |`);
  say(`| genuine texts flagged | ${fmtRate(sa.genuine.flagged, sa.genuine.n)} | ${fmtRate(sb.genuine.flagged, sb.genuine.n)} |`);
  say(`| ambiguous texts flagged | ${sa.ambiguous.flagged}/${sa.ambiguous.n} | ${sb.ambiguous.flagged}/${sb.ambiguous.n} |`);
  say(`| "very likely" on a genuine or ambiguous text (severe) | ${sa.severe} | ${sb.severe} |`);
  say('');
  say(`- Same four-way verdict both times: **${fmtRate(cmp.sameVerdict, cmp.n)}**`);
  say(`- Same flagged-or-not decision both times: **${fmtRate(cmp.sameFlag, cmp.n)}**`);
  say(`- The model's raw answer identical both times (where it was called): ${cmp.rawKnown ? fmtRate(cmp.rawSame, cmp.rawKnown) : 'n/a'}`);
  say('');
  say('| label | texts | same verdict | flagged both times | flagged once | not flagged either time | "very likely" both times | "very likely" once |');
  say('|---|---|---|---|---|---|---|---|');
  for (const label of ['scam', 'genuine', 'ambiguous']) {
    const g = cmp.byLabel[label];
    if (g) say(`| ${label} | ${g.n} | ${g.sameVerdict} | ${g.flagBoth} | ${g.flagOnlyOne} | ${g.flagNeither} | ${g.likelyBoth} | ${g.likelyOnlyOne} |`);
  }
  say('');
  if (cmp.flips.length) {
    say(`Texts whose verdict changed (${cmp.flips.length}; ids only):`);
    say('');
    for (const f of cmp.flips) say(`- ${f.id} (${f.label}, ${f.typ}): ${f.a} → ${f.b}${f.flagChanged ? ' — **crossed the flagged / not-flagged line**' : ''}`);
    say('');
  } else {
    say('No text changed its verdict.');
    say('');
  }
}

say('Two draws per text is a small look at variation, not a full measure: a text that stayed the same twice can still differ on a third try, and the texts are all invented.');

const out = opt('out', null);
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), lines.join('\n') + '\n');
  console.log(`\nWrote ${out}`);
}
