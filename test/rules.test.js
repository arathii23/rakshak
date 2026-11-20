import test from 'node:test';
import assert from 'node:assert/strict';
import { runRules, rulesVerdict } from '../src/rules.js';
import { analyze, locateQuote } from '../src/analyze.js';
import { CASES } from '../evals/cases.js';
import { VARIANTS } from '../evals/variants.js';

const verdictOf = (t) => rulesVerdict(runRules(t), t);

test('every rule highlight is an exact substring of the submitted text (all eval cases)', () => {
  for (const c of [...CASES, ...VARIANTS]) {
    const r = runRules(c.text);
    for (const s of r.signals) {
      assert.equal(c.text.slice(s.start, s.end), s.text, `${c.id}: span mismatch`);
      assert.ok(c.text.includes(s.text), `${c.id}: "${s.text}" not in text`);
    }
  }
});

test('single keywords alone never produce a scam or warning verdict', () => {
  for (const w of ['OTP', 'police', 'bank', 'CBI', 'urgent', 'ओटीपी', 'पुलिस', 'KYC', 'UPI', 'Aadhaar']) {
    assert.ok(['not_enough_info', 'no_clear_signs'].includes(verdictOf(w)), `${w}`);
  }
  for (const w of ['Hello OTP police bank urgent', 'police OTP bank UPI KYC Aadhaar']) {
    assert.ok(['not_enough_info', 'no_clear_signs'].includes(verdictOf(w)), `${w}`);
  }
});

test('"never share your OTP" style advice is not a scam signal (English, Hinglish, Hindi)', () => {
  const advice = [
    'Never share your OTP with anyone.',
    'Please do not share your PIN with anyone, even bank staff.',
    "Don't give your CVV to anybody who calls you.",
    'Apna OTP kisi ko mat batayein.',
    'Bank kabhi OTP nahi maangta.',
    'कृपया अपना ओटीपी किसी को न बताएं।',
    'बैंक कभी ओटीपी नहीं मांगता।',
  ];
  for (const t of advice) {
    const r = runRules(t);
    assert.equal(r.score, 0, `scored ${r.score}: ${t}`);
    assert.equal(r.strongIds.length, 0, `strong signal found: ${t}`);
  }
});

test('the same OTP words as a demand DO score', () => {
  for (const t of ['Please share your OTP now.', 'Apna OTP bata do.', 'अपना ओटीपी बताइए।', 'OTP batao aur kisi ko mat batana']) {
    assert.ok(runRules(t).score >= 1, t);
  }
});

test('a scam that also contains "kisi ko mat batana" is not hidden by the advisory rule', () => {
  const r = runRules('OTP batao, kisi ko mat batana');
  assert.ok(r.strongIds.includes('secret_request'));
});

test('doorstep delivery OTP is not flagged; the same OTP request without a door context is', () => {
  assert.equal(runRules('I am the delivery boy at your gate, please tell me the OTP.').score, 0);
  assert.ok(runRules('Your parcel is stuck at customs, please tell me the OTP.').score >= 1);
});

test('official-channel bill reminder is not a money demand', () => {
  assert.equal(runRules('Your bill of Rs 1450 is due. Please pay through the official app.').score, 0);
});

test('locateQuote finds exact text case-insensitively and rejects text that is not there', () => {
  const text = 'Main CBI se bol raha hoon';
  assert.deepEqual(locateQuote(text, 'cbi se bol'), { start: 5, end: 15 });
  assert.equal(locateQuote(text, 'police se bol'), null);
  assert.equal(locateQuote(text, ''), null);
});

const stubAi = (obj) => ({ chat: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)) });

test('AI cannot declare likely_scam when no rule signal exists (capped to warning_signs)', async () => {
  const text = 'He asked me about my holiday plans and the weather in Delhi';
  const r = await analyze({ text, lang: 'en', sarvam: stubAi({ verdict: 'likely_scam', quotes: [{ quote: 'holiday plans', why: 'x' }], explanation: 'Bad.' }) });
  assert.equal(r.verdict, 'warning_signs');
});

test('AI cannot raise a verdict without a quote that exists in the text', async () => {
  const text = 'He asked me about my holiday plans and the weather in Delhi';
  const r = await analyze({ text, lang: 'en', sarvam: stubAi({ verdict: 'warning_signs', quotes: [{ quote: 'send money to account', why: 'invented' }], explanation: 'Bad.' }) });
  assert.equal(r.verdict, 'no_clear_signs');
  assert.equal(r.highlights.length, 0);
});

test('AI quotes that are not in the text are dropped; real ones are kept', async () => {
  const text = 'Please send the money to my account, holiday plans are fine.';
  const r = await analyze({ text, lang: 'en', sarvam: stubAi({ verdict: 'warning_signs', quotes: [{ quote: 'holiday plans', why: 'real' }, { quote: 'totally invented words', why: 'fake' }], explanation: 'Ok.' }) });
  for (const h of r.highlights) assert.ok(text.includes(h.text));
  assert.ok(!r.highlights.some((h) => h.text === 'totally invented words'));
});

test('AI saying "no clear signs" cannot lower a rule-detected likely scam', async () => {
  const text = 'Main CBI se bol raha hoon. Digital arrest mein hain, OTP bata do.';
  const r = await analyze({ text, lang: 'en', sarvam: stubAi({ verdict: 'no_clear_signs', quotes: [], explanation: 'Seems fine.' }) });
  assert.equal(r.verdict, 'likely_scam');
  assert.notEqual(r.explanation, 'Seems fine.'); // contradicting AI text is replaced by the rule explanation
});

test('Hindi explanation requested but AI answers in English → falls back to Hindi template', async () => {
  const text = 'Please share your OTP now.';
  const r = await analyze({ text, lang: 'hi', sarvam: stubAi({ verdict: 'warning_signs', quotes: [], explanation: 'This asks for an OTP.' }) });
  assert.match(r.explanation, /[ऀ-ॿ]/);
});

test('verdict is never "safe" and no result carries a percentage field', async () => {
  for (const c of [...CASES, ...VARIANTS]) {
    const r = await analyze({ text: c.text, lang: c.lang, sarvam: null, limitedReason: 'test' });
    assert.ok(['not_enough_info', 'no_clear_signs', 'warning_signs', 'likely_scam'].includes(r.verdict));
    const s = JSON.stringify(r);
    assert.ok(!/probab|percent|\bscore\b|"safe"/i.test(s.replace(/This does not mean the call is safe/gi, '')), c.id);
  }
});
