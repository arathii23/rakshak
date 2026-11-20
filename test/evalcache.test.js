// The evaluation's answer cache and its "ask again" option. A second draw of the same request must get its own cache
// entry (so run-to-run variation can be measured) without disturbing any answer saved before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MODEL, Cache, Ledger, cacheKey, cachedSarvam, compareRuns } from '../evals/acc/lib.js';

const args = { system: 'S', user: 'U', schema: { a: 1 }, maxTokens: 450, temperature: 0.1 };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rakshak-evalcache-'));

test('sample 0 keeps the original cache key, so every saved answer still counts', () => {
  const original = crypto.createHash('sha256').update(JSON.stringify([MODEL, 'S', 'U', { a: 1 }, 450, 0.1])).digest('hex');
  assert.equal(cacheKey(args), original);
  assert.equal(cacheKey(args, 0), original);
});

test('each higher sample has its own key', () => {
  const keys = new Set([cacheKey(args), cacheKey(args, 1), cacheKey(args, 2)]);
  assert.equal(keys.size, 3);
});

test('sample 1 ignores a saved sample-0 answer, then caches its own without touching sample 0', async () => {
  const dir = tmp();
  const cache = new Cache(path.join(dir, 'chat.jsonl'));
  const ledger = new Ledger(path.join(dir, 'spend.json'), 5);
  cache.put({ k: cacheKey(args), content: 'first', usage: { p: 1, c: 1 }, finish: 'stop' });

  // sample 0 replays the saved answer
  const s0 = cachedSarvam({ real: null, cache, ledger, live: false });
  assert.equal(await s0.make().chat(args), 'first');

  // sample 1 in replay mode has nothing saved: a miss, not the sample-0 answer
  const s1 = cachedSarvam({ real: null, cache, ledger, live: false, sample: 1 });
  await assert.rejects(() => s1.make().chat(args));
  assert.equal(s1.state.misses, 1);

  // sample 1 live calls the client once, saves the answer and reports the tokens used
  let calls = 0;
  const fake = { async chat(a) { calls++; a.onUsage?.({ prompt_tokens: 10, completion_tokens: 5 }, { finish: 'stop' }); return 'second'; } };
  const live1 = cachedSarvam({ real: fake, cache, ledger, live: true, sample: 1 });
  const sv = live1.make();
  assert.equal(await sv.chat(args), 'second');
  assert.deepEqual(sv.last.usage, { p: 10, c: 5 });
  assert.equal(calls, 1);
  assert.equal(cache.get(cacheKey(args)).content, 'first');
  assert.equal(cache.get(cacheKey(args, 1)).content, 'second');

  // asking sample 1 again is now free
  assert.equal(await live1.make().chat(args), 'second');
  assert.equal(calls, 1);

  // a fresh process reading the file sees both answers
  const again = new Cache(path.join(dir, 'chat.jsonl'));
  assert.equal(again.get(cacheKey(args)).content, 'first');
  assert.equal(again.get(cacheKey(args, 1)).content, 'second');
});

test('compareRuns counts changed verdicts, flag changes and identical raw answers', () => {
  const row = (id, label, verdict, ch) => ({ id, label, typ: 't', verdict, ch });
  const a = [
    row('1', 'scam', 'likely_scam', 'x'),
    row('2', 'scam', 'warning_signs', 'y'),
    row('3', 'genuine', 'no_clear_signs', 'z'),
    row('4', 'genuine', 'warning_signs', null),
    row('5', 'scam', null, null),
  ];
  const b = [
    row('1', 'scam', 'likely_scam', 'x'),
    row('2', 'scam', 'no_clear_signs', 'q'),
    row('3', 'genuine', 'no_clear_signs', 'z2'),
    row('4', 'genuine', 'likely_scam', null),
    row('5', 'scam', 'likely_scam', null),
  ];
  const r = compareRuns(a, b);
  assert.equal(r.n, 4); // text 5 has no verdict in the first draw
  assert.equal(r.sameVerdict, 2);
  assert.equal(r.sameFlag, 3);
  assert.equal(r.rawKnown, 3);
  assert.equal(r.rawSame, 1);
  assert.deepEqual(r.flips.map((f) => [f.id, f.flagChanged]), [['2', true], ['4', false]]);
  assert.equal(r.byLabel.scam.flagBoth, 1);
  assert.equal(r.byLabel.scam.flagOnlyOne, 1);
  assert.equal(r.byLabel.genuine.flagNeither, 1);
  assert.equal(r.byLabel.genuine.likelyOnlyOne, 1);
});
