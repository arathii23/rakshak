import test from 'node:test';
import assert from 'node:assert/strict';
import { start, json, chatReply, FAKE_KEY } from './helpers.js';
import { makeWav, RATE } from '../src/wav.js';

const speech = (secs = 5) => makeWav(Int16Array.from({ length: Math.floor(RATE * secs) }, (_, i) => Math.round(8000 * Math.sin((2 * Math.PI * 220 * i) / RATE))));
const quiet = (secs = 5) => makeWav(new Int16Array(Math.floor(RATE * secs)));

/** Sarvam stub: transcripts come from a queue; chat replies come from `ai(userText)`. */
function stub({ transcripts = [], ai = () => ({ verdict: 'no_clear_signs', quotes: [], explanation: 'AI says: nothing clear.' }), sttFail = null, aiFail = null } = {}) {
  const q = [...transcripts];
  const fn = (url) => {
    if (url.endsWith('/speech-to-text')) return sttFail ? sttFail() : json({ transcript: q.shift() ?? '', language_code: 'hi-IN' });
    if (url.endsWith('/v1/chat/completions')) return aiFail ? aiFail() : chatReply(ai());
    throw new Error('unexpected ' + url);
  };
  fn.push = (t) => q.push(t);
  return fn;
}
const H = (code) => ({ 'content-type': 'audio/wav', 'x-session-code': code });
const create = async (s, lang = 'en') => (await (await s.post('/api/live/create', { lang })).json()).code;
const chunk = async (s, code, wav = speech()) => { const r = await s.post('/api/live/chunk', wav, H(code)); return { status: r.status, body: await r.json() }; };
const state = async (s, code) => (await s.get(`/api/live/state?code=${code}`)).json();

test('live: create returns a 6-character code from an unambiguous alphabet; no key → 503', async () => {
  const s = await start({ sarvam: stub() });
  const code = await create(s);
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  await s.close();
  const n = await start({ env: { SARVAM_API_KEY: '' } });
  assert.equal((await n.post('/api/live/create', { lang: 'en' })).status, 503);
  await n.close();
});

test('live: unknown code → 404, and repeated guessing is rate limited', async () => {
  const s = await start({ sarvam: stub(), env: { LIVE_BAD_CODE_PER_10MIN: '3' } });
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await s.get('/api/live/state?code=ZZZZZZ')).status);
  assert.deepEqual(codes, [404, 404, 404, 429, 429]);
  await s.close();
});

test('live: a silent chunk is skipped without calling Sarvam (no cost), session shows listening', async () => {
  const s = await start({ sarvam: stub() });
  const code = await create(s);
  const r = await chunk(s, code, quiet());
  assert.equal(r.status, 200); assert.equal(r.body.skipped, 'silent');
  assert.equal(s.calls.length, 0);
  assert.equal((await state(s, code)).status, 'listening');
  await s.close();
});

test('live: speech chunk is transcribed, shown to family, and the code is not needed in the URL for chunks', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['Hello beta kaise ho aap'] }) });
  const code = await create(s, 'hi');
  const r = await chunk(s, code);
  assert.equal(r.status, 200);
  const st = await state(s, code);
  assert.equal(st.status, 'listening'); assert.equal(st.lang, 'hi');
  assert.match(st.latest.text, /Hello beta kaise ho aap/);
  assert.equal(st.alertLevel, 'none');
  assert.ok(!s.calls.some((c) => c.url.includes(code))); // the code is never sent to Sarvam
  await s.close();
});

test('live: a scam unfolding across chunks raises the alert; family stream receives it; Sarvam called with the key', async () => {
  const s = await start({
    sarvam: stub({
      transcripts: ['Main CBI se bol raha hoon', 'Aapke naam par case darj hua hai aur digital arrest hai', 'Abhi apna OTP bata dijiye kisi ko mat batana'],
      ai: () => ({ verdict: 'likely_scam', quotes: [{ quote: 'OTP bata dijiye', why: 'asks for OTP' }], explanation: 'Caller demands an OTP.' }),
    }),
    env: { LIVE_AI_PER_SESSION: '5' },
  });
  const code = await create(s);
  const stream = await fetch(`${s.base}/api/live/stream?code=${code}`);
  assert.equal(stream.headers.get('content-type').split(';')[0], 'text/event-stream');
  const reader = stream.body.getReader(); const dec = new TextDecoder(); let buf = '';
  const nextState = async () => { for (;;) { const i = buf.indexOf('\n\n'); if (i >= 0) { const block = buf.slice(0, i); buf = buf.slice(i + 2); const m = block.match(/^data: (.*)$/m); if (m) return JSON.parse(m[1]); continue; } const { value, done } = await reader.read(); if (done) return null; buf += dec.decode(value); } };

  assert.equal((await nextState()).status, 'waiting'); // initial snapshot
  let last;
  for (let i = 0; i < 3; i++) { await chunk(s, code); last = await nextState(); }
  assert.equal(last.alertLevel, 'likely_scam');
  assert.ok(last.alertSeq >= 1);
  assert.ok(last.alert.nextStep && last.alert.explanation);
  for (const h of last.alert.highlights) assert.ok(last.alert.text.includes(h.text), 'alert highlights must be in the alert text');
  assert.ok(s.calls.some((c) => c.url.endsWith('/v1/chat/completions') && c.init.headers['api-subscription-key'] === FAKE_KEY));
  await reader.cancel();
  await s.close();
});

test('live: the alert never goes back down during a call, even if later speech is harmless', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['Main CBI se bol raha hoon digital arrest hai OTP bata do', 'Ok thank you bye bye', 'Haan theek hai phir baat karte hain'] }) });
  const code = await create(s);
  await chunk(s, code);
  const up = await state(s, code);
  assert.ok(['warning_signs', 'likely_scam'].includes(up.alertLevel));
  await chunk(s, code); await chunk(s, code);
  const after = await state(s, code);
  assert.equal(after.alertLevel, up.alertLevel);
  assert.equal(after.alertSeq, up.alertSeq);
  await s.close();
});

test('live: harmless conversation and "never share your OTP" advice stay at no alert', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['Hello Dadi main Rohan kal milne aaunga', 'Never share your OTP with anyone bank staff will never ask for it'] }) });
  const code = await create(s);
  await chunk(s, code); await chunk(s, code);
  assert.equal((await state(s, code)).alertLevel, 'none');
  await s.close();
});

test('live: speech-to-text failure → 502 service_error, family sees the problem, usage refunded', async () => {
  const s = await start({ sarvam: stub({ sttFail: () => json({}, 500) }), env: { DAILY_STT_SECONDS: '6', IP_LIVE_CHUNKS_PER_MIN: '99' } });
  const code = await create(s);
  for (let i = 0; i < 3; i++) { const r = await chunk(s, code); assert.equal(r.status, 502); assert.equal(r.body.error.kind, 'server'); }
  assert.equal((await state(s, code)).sttError, 'server');
  await s.close();
});

test('live: AI failure → rules still raise the alert, and the family is told the AI is unavailable', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['Main CBI se bol raha hoon digital arrest hai OTP bata do abhi'], aiFail: () => json({}, 500) }) });
  const code = await create(s);
  await chunk(s, code);
  const st = await state(s, code);
  assert.equal(st.alertLevel, 'likely_scam');
  assert.equal(st.note.ai, 'server');
  await s.close();
});

test('live: per-session listening cap → 429 session_cap and the family sees "capped"', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['one two three four five six', 'seven eight nine ten eleven twelve'] }), env: { LIVE_SESSION_MAX_SECONDS: '8', IP_LIVE_CHUNKS_PER_MIN: '99' } });
  const code = await create(s);
  assert.equal((await chunk(s, code, speech(5))).status, 200);
  const r = await chunk(s, code, speech(5));
  assert.equal(r.status, 429); assert.equal(r.body.error.code, 'session_cap');
  assert.equal((await state(s, code)).capped, true);
  await s.close();
});

test('live: AI calls per session are capped; rules keep working after the cap', async () => {
  const ts = Array.from({ length: 6 }, (_, i) => `this is ordinary chat number ${i} about the weather and food today`);
  const s = await start({ sarvam: stub({ transcripts: ts }), env: { LIVE_AI_PER_SESSION: '2', IP_LIVE_CHUNKS_PER_MIN: '99' } });
  const code = await create(s);
  for (let i = 0; i < 6; i++) await chunk(s, code);
  assert.equal(s.calls.filter((c) => c.url.endsWith('/v1/chat/completions')).length, 2);
  await s.close();
});

test('live: daily speech cap is shared and stops chunks with daily_cap', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['alpha beta gamma delta epsilon zeta', 'eta theta iota kappa lambda mu'] }), env: { DAILY_STT_SECONDS: '6', IP_LIVE_CHUNKS_PER_MIN: '99' } });
  const code = await create(s);
  assert.equal((await chunk(s, code, speech(5))).status, 200);
  const r = await chunk(s, code, speech(5));
  assert.equal(r.status, 429); assert.equal(r.body.error.code, 'daily_cap');
  await s.close();
});

test('live: ending the session wipes the transcript and alert; later chunks get 410', async () => {
  const s = await start({ sarvam: stub({ transcripts: ['Main CBI se bol raha hoon digital arrest hai OTP bata do abhi'] }) });
  const code = await create(s);
  await chunk(s, code);
  assert.ok((await state(s, code)).latest.text.length > 0);
  assert.equal((await s.post('/api/live/end?code=' + code, '')).status, 200);
  const st = await state(s, code);
  assert.equal(st.status, 'ended'); assert.equal(st.latest.text, ''); assert.equal(st.alert, null);
  assert.ok(['likely_scam', 'warning_signs'].includes(st.finalLevel)); // only the level survives, never the words
  assert.equal((await chunk(s, code)).status, 410);
  assert.equal(JSON.stringify(s.app.live._sessions.get(code)).includes('CBI'), false);
  await s.close();
});

test('live: an idle session expires and is wiped (injected clock)', async () => {
  let t = Date.parse('2026-11-20T10:00:00Z');
  const s = await start({ sarvam: stub({ transcripts: ['Main CBI se bol raha hoon digital arrest hai OTP bata do abhi'] }), now: () => t });
  const code = await create(s);
  await chunk(s, code);
  t += 16 * 60 * 1000;
  s.app.live.sweep();
  const st = await state(s, code);
  assert.equal(st.status, 'ended'); assert.equal(st.latest.text, '');
  await s.close();
});

test('live: too many concurrent sessions → 503 busy; per-IP creation limit → 429', async () => {
  const s = await start({ sarvam: stub(), env: { LIVE_MAX_SESSIONS: '2', LIVE_CREATE_PER_HOUR: '9' } });
  await create(s); await create(s);
  const r = await s.post('/api/live/create', { lang: 'en' });
  assert.equal(r.status, 503); assert.equal((await r.json()).error.code, 'busy');
  await s.close();
  const s2 = await start({ sarvam: stub(), env: { LIVE_CREATE_PER_HOUR: '2' } });
  await create(s2); await create(s2);
  assert.equal((await s2.post('/api/live/create', { lang: 'en' })).status, 429);
  await s2.close();
});

test('live: wrong content type → 415; non-WAV bytes → 422; the 6th viewer is refused', async () => {
  const s = await start({ sarvam: stub() });
  const code = await create(s);
  assert.equal((await s.post('/api/live/chunk', speech(), { 'content-type': 'audio/webm', 'x-session-code': code })).status, 415);
  assert.equal((await s.post('/api/live/chunk', Buffer.from('not a wav file at all, just text'), H(code))).status, 422);
  const readers = [];
  for (let i = 0; i < 6; i++) { const r = await fetch(`${s.base}/api/live/stream?code=${code}`); readers.push(r); }
  const refused = await fetch(`${s.base}/api/live/stream?code=${code}`);
  assert.equal(refused.status, 429);
  assert.equal((await refused.json()).error.code, 'too_many_viewers');
  for (const r of readers) await r.body.cancel();
  await s.close();
});

test('live privacy: transcript words never appear in server logs or error bodies', async () => {
  const WORDS = 'ZXQ-LIVE-SECRET-90210';
  const s = await start({ sarvam: stub({ transcripts: [`${WORDS} aapka OTP bata dijiye`] , aiFail: () => json({ echo: WORDS }, 500) }) });
  const code = await create(s);
  const bodies = [JSON.stringify((await chunk(s, code)).body), await (await s.get('/api/live/state?code=NOPE00')).text(), await (await s.post('/api/live/end?code=NOPE00', '')).text()];
  const all = bodies.join('\n') + '\n' + s.logs.join('\n');
  assert.ok(!all.includes(WORDS), 'transcript leaked into logs/errors');
  assert.ok(!all.includes(FAKE_KEY));
  assert.ok(!s.logs.some((l) => l.includes(code)), 'session code leaked into logs (query strings are never logged)');
  await s.close();
});
