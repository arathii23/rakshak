// Helpers for the accuracy evaluation: a cache of raw model answers, a spend ledger with a hard cap, a wrapper
// around the Sarvam client that uses both, and the scoring maths. Nothing here prints text from the cases, the
// model answers or the API key.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { SarvamError } from '../../src/sarvam.js';

export const MODEL = 'sarvam-105b-conversations';

// Upper-bound prices in rupees (see docs/RESEARCH.md section 4): the pricing pages say 10 / 25 per million
// tokens, but the highest figure seen anywhere is used so the cap can only over-estimate spend.
export const PRICE = { inPerM: 29.28, outPerM: 73.2, sttPerMin: 0.6 };

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Same inputs → same key, so an unchanged prompt and text is never paid for twice. Sample 0 is the original answer
 * (its key is unchanged, so every answer saved so far still counts). A higher sample number asks for another,
 * independent answer to the identical request; it gets its own cache entry and never touches sample 0. That is how
 * run-to-run variation is measured.
 */
export const cacheKey = ({ system, user, schema, maxTokens = 450, temperature = 0.1 }, sample = 0) =>
  sha(JSON.stringify(sample > 0
    ? [MODEL, system, user, schema ?? null, maxTokens, temperature, `sample-${sample}`]
    : [MODEL, system, user, schema ?? null, maxTokens, temperature]));

export class Cache {
  constructor(file) {
    this.file = file;
    this.map = new Map();
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line); this.map.set(r.k, r); } catch { /* skip a torn line */ }
      }
    }
  }
  get(k) { return this.map.get(k); }
  put(rec) { this.map.set(rec.k, rec); fs.appendFileSync(this.file, JSON.stringify(rec) + '\n'); }
}

export class Ledger {
  constructor(file, capRs) {
    this.file = file;
    this.capRs = capRs;
    this.d = { calls: 0, failedCalls: 0, promptTokens: 0, completionTokens: 0, sttSeconds: 0, estRs: 0, updated: null };
    if (fs.existsSync(file)) { try { Object.assign(this.d, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { /* start fresh */ } }
  }
  static cost({ promptTokens = 0, completionTokens = 0, sttSeconds = 0 }) {
    return (promptTokens * PRICE.inPerM) / 1e6 + (completionTokens * PRICE.outPerM) / 1e6 + (sttSeconds / 60) * PRICE.sttPerMin;
  }
  get estRs() { return this.d.estRs; }
  headroom() { return this.capRs - this.d.estRs; }
  avgCall() { return this.d.calls > 0 ? this.d.estRs / this.d.calls : 0.05; }
  add(u, ok = true) {
    this.d.calls += ok ? 1 : 0;
    this.d.failedCalls += ok ? 0 : 1;
    this.d.promptTokens += u.promptTokens || 0;
    this.d.completionTokens += u.completionTokens || 0;
    this.d.sttSeconds += u.sttSeconds || 0;
    this.d.estRs = +(this.d.estRs + Ledger.cost(u)).toFixed(6);
    this.d.updated = new Date().toISOString();
    fs.writeFileSync(this.file, JSON.stringify(this.d, null, 2));
  }
}

const RETRY = new Set(['rate_limited', 'timeout', 'network', 'server']);
const FATAL = new Set(['auth', 'quota']);

/**
 * A stand-in for the Sarvam client. Answers from the cache when it can; otherwise (live mode only) calls the real
 * client with retries, counts the tokens against the ledger, and caches the answer. `make()` returns a fresh object
 * per case so that `.last` describes only that case's call.
 */
export function cachedSarvam({ real, cache, ledger, live, sample = 0 }) {
  const state = { hits: 0, misses: 0, calls: 0, retries: 0, failures: 0, fatal: null, budgetStop: false };
  const make = () => {
    const self = {
      last: null,
      async chat(args) {
        const k = cacheKey(args, sample);
        const hit = cache.get(k);
        if (hit) { state.hits++; self.last = { fromCache: true, content: hit.content, finish: hit.finish, usage: hit.usage ?? null }; return hit.content; }
        if (!live) { state.misses++; self.last = { miss: true }; throw new SarvamError('network'); }
        if (state.fatal) { self.last = { fatal: state.fatal }; throw new SarvamError(state.fatal); }
        if (ledger.headroom() < Math.max(ledger.avgCall() * 2, 0.05)) {
          state.budgetStop = true; self.last = { budget: true }; throw new SarvamError('quota');
        }
        const inputChars = (args.system?.length || 0) + (args.user?.length || 0);
        for (let attempt = 0; ; attempt++) {
          let usage = null, meta = null;
          try {
            const content = await real.chat({ ...args, onUsage: (u, m) => { usage = u; meta = m; } });
            const toks = {
              promptTokens: usage?.prompt_tokens ?? Math.ceil(inputChars / 3),
              completionTokens: usage?.completion_tokens ?? Math.ceil(content.length / 3),
            };
            ledger.add(toks, true);
            state.calls++;
            cache.put({ k, content, usage: { p: toks.promptTokens, c: toks.completionTokens }, finish: meta?.finish ?? null, ts: new Date().toISOString() });
            self.last = { fromCache: false, content, finish: meta?.finish ?? null, usage: { p: toks.promptTokens, c: toks.completionTokens } };
            return content;
          } catch (e) {
            if (usage) ledger.add({ promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0 }, false);
            else if (e?.kind === 'timeout') ledger.add({ promptTokens: Math.ceil(inputChars / 3) }, false);
            const kind = e instanceof SarvamError ? e.kind : 'network';
            if (FATAL.has(kind)) { state.fatal = kind; self.last = { fatal: kind }; throw e; }
            if ((RETRY.has(kind) || (kind === 'bad_response' && attempt < 1)) && attempt < 4) {
              state.retries++;
              await sleep(1500 * 2 ** attempt + Math.floor(Math.random() * 500));
              continue;
            }
            state.failures++;
            self.last = { failed: kind };
            throw e;
          }
        }
      },
    };
    return self;
  };
  return { make, state };
}

/** Run `fn` over `items` with at most `n` in flight. */
export async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
  });
  await Promise.all(workers);
}

// ---------------- scoring ----------------
export const FLAGGED = new Set(['warning_signs', 'likely_scam']);

export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
export const fmtRate = (k, n) => {
  if (!n) return 'n/a';
  const [lo, hi] = wilson(k, n);
  return `${pct(k / n)} (${k}/${n}; 95% CI ${pct(lo)}–${pct(hi)})`;
};

/**
 * Compare two draws of the same texts. a and b are arrays of { id, label, typ, verdict, ch } where ch is a short hash
 * of the model's raw answer (null when the model was not called). Only texts that have a verdict in both draws are
 * compared. A "flip" is any text whose four-way verdict differs; `flagChanged` marks the ones that also crossed the
 * line between flagged and not flagged.
 */
export function compareRuns(a, b) {
  const other = new Map(b.map((r) => [r.id, r]));
  const out = { n: 0, sameVerdict: 0, sameFlag: 0, rawKnown: 0, rawSame: 0, flips: [], byLabel: {} };
  for (const x of a) {
    const y = other.get(x.id);
    if (!x.verdict || !y?.verdict) continue;
    out.n++;
    const fx = FLAGGED.has(x.verdict), fy = FLAGGED.has(y.verdict);
    const lx = x.verdict === 'likely_scam', ly = y.verdict === 'likely_scam';
    if (x.verdict === y.verdict) out.sameVerdict++;
    if (fx === fy) out.sameFlag++;
    if (x.ch && y.ch) { out.rawKnown++; if (x.ch === y.ch) out.rawSame++; }
    const g = (out.byLabel[x.label] ??= { n: 0, sameVerdict: 0, flagBoth: 0, flagOnlyOne: 0, flagNeither: 0, likelyBoth: 0, likelyOnlyOne: 0, likelyNeither: 0 });
    g.n++;
    if (x.verdict === y.verdict) g.sameVerdict++;
    if (fx && fy) g.flagBoth++; else if (fx || fy) g.flagOnlyOne++; else g.flagNeither++;
    if (lx && ly) g.likelyBoth++; else if (lx || ly) g.likelyOnlyOne++; else g.likelyNeither++;
    if (x.verdict !== y.verdict) out.flips.push({ id: x.id, label: x.label, typ: x.typ, a: x.verdict, b: y.verdict, flagChanged: fx !== fy });
  }
  return out;
}

/** rows: [{ c: case, verdict }] with verdict never null. */
export function score(rows) {
  const by = (label) => rows.filter((r) => r.c.label === label);
  const scam = by('scam'), genuine = by('genuine'), amb = by('ambiguous');
  const flagged = (rs) => rs.filter((r) => FLAGGED.has(r.verdict)).length;
  const likely = (rs) => rs.filter((r) => r.verdict === 'likely_scam').length;
  const tp = flagged(scam), fp = flagged(genuine);
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = scam.length ? tp / scam.length : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const typ = {};
  for (const r of scam) {
    typ[r.c.typ] ??= { n: 0, flagged: 0, likely: 0 };
    typ[r.c.typ].n++;
    if (FLAGGED.has(r.verdict)) typ[r.c.typ].flagged++;
    if (r.verdict === 'likely_scam') typ[r.c.typ].likely++;
  }
  const slice = (key) => {
    const out = {};
    for (const r of rows) {
      const k = r.c[key];
      out[k] ??= { scamN: 0, scamFlag: 0, genN: 0, genFlag: 0 };
      if (r.c.label === 'scam') { out[k].scamN++; if (FLAGGED.has(r.verdict)) out[k].scamFlag++; }
      if (r.c.label === 'genuine') { out[k].genN++; if (FLAGGED.has(r.verdict)) out[k].genFlag++; }
    }
    return out;
  };
  const confusion = {};
  for (const r of rows) { confusion[r.c.label] ??= {}; confusion[r.c.label][r.verdict] = (confusion[r.c.label][r.verdict] || 0) + 1; }
  return {
    n: rows.length,
    scam: { n: scam.length, flagged: tp, likely: likely(scam) },
    genuine: { n: genuine.length, flagged: fp, likely: likely(genuine) },
    ambiguous: { n: amb.length, flagged: flagged(amb), likely: likely(amb) },
    severe: likely(genuine) + likely(amb),
    precision, recall, f1, typ, byLang: slice('lang'), byStyle: slice('style'), confusion,
  };
}
