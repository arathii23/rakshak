// Sanity checks on the labelled accuracy sets: they are what the accuracy numbers stand on, so a typo in a label,
// a duplicated text, or a case that leaks from the development set into a test set would quietly spoil them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV } from '../evals/data/dev.js';
import { DEV2 } from '../evals/data/dev2.js';
import { TEST_A } from '../evals/data/test-a.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const testBFile = path.join(here, '..', 'evals', 'data', 'test-b.json');
const TEST_B = fs.existsSync(testBFile) ? JSON.parse(fs.readFileSync(testBFile, 'utf8')).cases : [];

const SETS = { dev: DEV, dev2: DEV2, 'test-a': TEST_A, ...(TEST_B.length ? { 'test-b': TEST_B } : {}) };
const LABELS = ['scam', 'genuine', 'ambiguous'];
const LANGS = ['en', 'hinglish', 'hi'];
const STYLES = ['caller', 'dialogue', 'stt', 'msg', 'chunk'];
const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();

for (const [name, cases] of Object.entries(SETS)) {
  test(`${name}: every case is well formed`, () => {
    assert.ok(cases.length >= 50, `${name} is too small to say anything (${cases.length})`);
    const ids = new Set();
    for (const c of cases) {
      assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
      ids.add(c.id);
      assert.ok(LABELS.includes(c.label), `${c.id}: bad label ${c.label}`);
      assert.ok(LANGS.includes(c.lang), `${c.id}: bad lang ${c.lang}`);
      assert.ok(STYLES.includes(c.style), `${c.id}: bad style ${c.style}`);
      assert.ok(typeof c.typ === 'string' && c.typ.length > 1, `${c.id}: missing type`);
      assert.ok(typeof c.text === 'string' && c.text.trim().length >= 10, `${c.id}: text too short`);
      assert.ok(c.text.length <= 1000, `${c.id}: text longer than the app accepts (1000 characters)`);
    }
  });

  test(`${name}: has all three labels and the three languages`, () => {
    for (const l of LABELS) assert.ok(cases.some((c) => c.label === l), `${name} has no ${l} case`);
    for (const l of LANGS) assert.ok(cases.filter((c) => c.lang === l).length >= 8, `${name} has too few ${l} cases`);
    const genuineShare = cases.filter((c) => c.label !== 'scam').length / cases.length;
    assert.ok(genuineShare >= 0.3, `${name}: only ${(genuineShare * 100).toFixed(0)}% non-scam cases; hard negatives matter`);
  });
}

test('no text appears in two different sets (a test case must never leak from development)', () => {
  const seen = new Map();
  for (const [name, cases] of Object.entries(SETS)) {
    for (const c of cases) {
      const k = norm(c.text);
      assert.ok(!seen.has(k) || seen.get(k) === name, `${c.id} in ${name} duplicates a case in ${seen.get(k)}`);
      seen.set(k, name);
    }
  }
});

test('no text is repeated inside a set', () => {
  for (const [name, cases] of Object.entries(SETS)) {
    const texts = new Set();
    for (const c of cases) {
      const k = norm(c.text);
      assert.ok(!texts.has(k), `${name}: ${c.id} repeats an earlier text`);
      texts.add(k);
    }
  }
});
