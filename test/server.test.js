import test from 'node:test';
import assert from 'node:assert/strict';
import { start, json, chatReply, aiOk, FAKE_KEY } from './helpers.js';
import { makeWav, RATE } from '../src/wav.js';

const SCAM = 'This is SBI customer care. Your KYC has expired and your account will be blocked today. Please share the OTP we just sent to update it immediately.';
const sine = (secs, amp = 8000) => makeWav(Int16Array.from({ length: Math.floor(RATE * secs) }, (_, i) => Math.round(amp * Math.sin((2 * Math.PI * 220 * i) / RATE))));
const silence = (secs) => makeWav(new Int16Array(Math.floor(RATE * secs)));
const wavHeaders = { 'content-type': 'audio/wav' };

// ---------- /api/check: input validation ----------
test('check: empty / whitespace text → 400 empty_text, no Sarvam call', async () => {
  const s = await start({ sarvam: aiOk('no_clear_signs') });
  for (const text of ['', '   \n ']) {
    const r = await s.post('/api/check', { text, lang: 'en' });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error.code, 'empty_text');
  }
  assert.equal(s.calls.length, 0);
  await s.close();
});

test('check: invalid JSON → 400; text over limit → 413', async () => {
  const s = await start({ sarvam: aiOk('no_clear_signs') });
  assert.equal((await s.post('/api/check', '{not json')).status, 400);
  const r = await s.post('/api/check', { text: 'a '.repeat(600), lang: 'en' });
  assert.equal(r.status, 413);
  assert.equal((await r.json()).error.code, 'text_too_long');
  await s.close();
});

test('check: a very short text returns not_enough_info without spending an AI call', async () => {
  const s = await start({ sarvam: aiOk('likely_scam') });
  const r = await (await s.post('/api/check', { text: 'OTP', lang: 'en' })).json();
  assert.equal(r.verdict, 'not_enough_info');
  assert.equal(r.limited, false);
  assert.equal(s.calls.length, 0);
  await s.close();
});

// ---------- /api/check: happy path and request shape ----------
test('check: AI path returns ai source, validated quotes only, and sends the right Sarvam request', async () => {
  const s = await start({ sarvam: aiOk('likely_scam', [{ quote: 'share the OTP', why: 'asks for code' }, { quote: 'not in text', why: 'fake' }], 'It asks for an OTP.') });
  const r = await (await s.post('/api/check', { text: SCAM, lang: 'en' })).json();
  assert.equal(r.source, 'ai'); assert.equal(r.limited, false);
  assert.equal(r.verdict, 'likely_scam');
  for (const h of r.highlights) assert.ok(SCAM.includes(h.text));
  assert.ok(!r.highlights.some((h) => h.text === 'not in text'));
  const call = s.calls[0];
  assert.equal(call.url, 'https://api.sarvam.ai/v1/chat/completions');
  assert.equal(call.init.headers['api-subscription-key'], FAKE_KEY);
  const body = JSON.parse(call.init.body);
  assert.equal(body.model, 'sarvam-105b-conversations');
  assert.equal(body.response_format.type, 'json_schema');
  assert.ok(body.max_tokens <= 500);
  await s.close();
});

test('check: long digit strings (OTPs, card numbers) are masked before reaching the AI', async () => {
  const s = await start({ sarvam: aiOk('warning_signs') });
  await s.post('/api/check', { text: 'He asked me to share my card number 4111111111111111 and OTP 482913 now', lang: 'en' });
  const sent = JSON.parse(s.calls[0].init.body).messages[1].content;
  assert.ok(!sent.includes('4111111111111111') && !sent.includes('482913'));
  await s.close();
});

// ---------- /api/check: Sarvam failures → clearly labelled limited result ----------
const failures = [
  ['HTTP 500', () => json({ error: 'x' }, 500), 'server'],
  ['HTTP 503', () => json({ error: 'x' }, 503), 'server'],
  ['HTTP 429', () => json({ error: 'x' }, 429), 'rate_limited'],
  ['HTTP 402 out of credit', () => json({ error: 'x' }, 402), 'quota'],
  ['HTTP 401', () => json({ error: 'x' }, 401), 'auth'],
  ['HTTP 403', () => json({ error: 'x' }, 403), 'auth'],
  ['network failure', () => { throw new TypeError('fetch failed'); }, 'network'],
  ['malformed JSON from model', () => chatReply('this is not json {'), 'bad_response'],
  ['verdict outside the allowed set', () => chatReply({ verdict: 'definitely_safe', quotes: [], explanation: 'x' }), 'bad_response'],
  ['empty model content', () => chatReply('   '), 'bad_response'],
  ['response without choices', () => json({}), 'bad_response'],
];
for (const [name, sarvam, reason] of failures) {
  test(`check: Sarvam failure (${name}) → limited rule-based result labelled "${reason}"`, async () => {
    const s = await start({ sarvam });
    const res = await s.post('/api/check', { text: SCAM, lang: 'en' });
    assert.equal(res.status, 200);
    const r = await res.json();
    assert.equal(r.limited, true);
    assert.equal(r.limitedReason, reason);
    assert.equal(r.source, 'rules');
    assert.equal(r.verdict, 'likely_scam'); // rules still catch this one
    assert.ok(r.nextStep && r.explanation);
    await s.close();
  });
}

test('check: Sarvam timeout → limited result labelled "timeout"', async () => {
  const sarvam = (_u, init) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const s = await start({ env: { CHAT_TIMEOUT_MS: '60' }, sarvam });
  const r = await (await s.post('/api/check', { text: SCAM, lang: 'en' })).json();
  assert.equal(r.limited, true); assert.equal(r.limitedReason, 'timeout');
  await s.close();
});

test('check: no API key configured → limited result labelled "not_configured"', async () => {
  const s = await start({ env: { SARVAM_API_KEY: '' } });
  const r = await (await s.post('/api/check', { text: SCAM, lang: 'hi' })).json();
  assert.equal(r.limited, true); assert.equal(r.limitedReason, 'not_configured');
  assert.match(r.nextStep, /[ऀ-ॿ]/); // Hindi requested → Hindi next step
  await s.close();
});

test('check: limited mode is honest on a genuine call (no false alarm) and on unclear text', async () => {
  const s = await start({ sarvam: () => json({}, 500) });
  const g = await (await s.post('/api/check', { text: 'Never share your OTP with anyone. Bank staff will never ask for it.', lang: 'en' })).json();
  assert.equal(g.limited, true); assert.equal(g.verdict, 'no_clear_signs');
  assert.match(g.explanation, /not.*safe|does not prove|advice/i);
  await s.close();
});

// ---------- limits ----------
test('limits: per-IP check limit → further checks are limited (rate_limited), AI not called', async () => {
  const s = await start({ env: { IP_CHECKS_PER_10MIN: '2' }, sarvam: aiOk('warning_signs') });
  const out = [];
  for (let i = 0; i < 4; i++) out.push(await (await s.post('/api/check', { text: SCAM, lang: 'en' })).json());
  assert.deepEqual(out.map((r) => r.limitedReason), [null, null, 'rate_limited', 'rate_limited']);
  assert.equal(s.calls.length, 2);
  await s.close();
});

test('limits: global daily AI cap → limited (daily_cap) and resets on the next IST day', async () => {
  let t = Date.parse('2026-11-20T10:00:00Z');
  const s = await start({ env: { DAILY_AI_CHECKS: '2', IP_CHECKS_PER_10MIN: '99', IP_CHECKS_PER_DAY: '99' }, sarvam: aiOk('warning_signs'), now: () => t });
  const reasons = [];
  for (let i = 0; i < 3; i++) reasons.push((await (await s.post('/api/check', { text: SCAM, lang: 'en' })).json()).limitedReason);
  assert.deepEqual(reasons, [null, null, 'daily_cap']);
  t += 24 * 3600 * 1000;
  assert.equal((await (await s.post('/api/check', { text: SCAM, lang: 'en' })).json()).limitedReason, null);
  await s.close();
});

test('limits: the rate limit keys on the proxy-supplied client IP, not a spoofable left-most value', async () => {
  const s = await start({ env: { IP_CHECKS_PER_10MIN: '1', TRUST_PROXY_HOPS: '1' }, sarvam: aiOk('warning_signs') });
  const hit = (xff) => s.post('/api/check', { text: SCAM, lang: 'en' }, { 'x-forwarded-for': xff }).then((r) => r.json());
  assert.equal((await hit('9.9.9.9, 1.1.1.1')).limitedReason, null);          // client 1.1.1.1
  assert.equal((await hit('8.8.8.8, 1.1.1.1')).limitedReason, 'rate_limited'); // same client, different spoofed prefix
  assert.equal((await hit('9.9.9.9, 2.2.2.2')).limitedReason, null);          // a different client
  await s.close();
});

// ---------- /api/transcribe ----------
const sttOk = (text) => () => json({ transcript: text, language_code: 'hi-IN' });

test('transcribe: good 3 s recording → transcript; request to Sarvam is correct', async () => {
  const s = await start({ sarvam: sttOk('Aapka OTP bata dijiye') });
  const r = await s.post('/api/transcribe', sine(3), wavHeaders);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).transcript, 'Aapka OTP bata dijiye');
  assert.equal(s.calls[0].url, 'https://api.sarvam.ai/speech-to-text');
  assert.equal(s.calls[0].init.headers['api-subscription-key'], FAKE_KEY);
  assert.equal(s.calls[0].init.body.get('model'), 'saaras:v4');
  await s.close();
});

test('transcribe: silent recording → 422 silent, no Sarvam call, no credits used', async () => {
  const s = await start({ sarvam: sttOk('x') });
  const r = await s.post('/api/transcribe', silence(3), wavHeaders);
  assert.equal(r.status, 422); assert.equal((await r.json()).error.code, 'silent');
  assert.equal(s.calls.length, 0);
  await s.close();
});

test('transcribe: empty body / tiny body → 422 bad_audio; too short → 422 too_short', async () => {
  const s = await start({ sarvam: sttOk('x') });
  assert.equal((await (await s.post('/api/transcribe', Buffer.alloc(0), wavHeaders)).json()).error.code, 'bad_audio');
  assert.equal((await (await s.post('/api/transcribe', Buffer.from('hello'), wavHeaders)).json()).error.code, 'bad_audio');
  assert.equal((await (await s.post('/api/transcribe', sine(0.3), wavHeaders)).json()).error.code, 'too_short');
  assert.equal(s.calls.length, 0);
  await s.close();
});

test('transcribe: recording longer than the limit → rejected (422 too_long or 413), no Sarvam call', async () => {
  const s = await start({ sarvam: sttOk('x') });
  const r = await s.post('/api/transcribe', sine(25), wavHeaders);
  assert.ok([413, 422].includes(r.status));
  assert.equal(s.calls.length, 0);
  await s.close();
});

test('transcribe: wrong content type → 415; wrong sample rate WAV → 422 bad_audio', async () => {
  const s = await start({ sarvam: sttOk('x') });
  assert.equal((await s.post('/api/transcribe', sine(2), { 'content-type': 'audio/webm' })).status, 415);
  const bad = sine(2); bad.writeUInt32LE(44100, 24);
  assert.equal((await (await s.post('/api/transcribe', bad, wavHeaders)).json()).error.code, 'bad_audio');
  await s.close();
});

test('transcribe: Sarvam hears nothing (empty transcript) → 422 no_speech', async () => {
  const s = await start({ sarvam: sttOk('   ') });
  const r = await s.post('/api/transcribe', sine(3), wavHeaders);
  assert.equal(r.status, 422); assert.equal((await r.json()).error.code, 'no_speech');
  await s.close();
});

for (const [name, resp, kind] of [['HTTP 500', () => json({}, 500), 'server'], ['HTTP 429', () => json({}, 429), 'rate_limited'], ['HTTP 402', () => json({}, 402), 'quota'], ['network', () => { throw new TypeError('x'); }, 'network']]) {
  test(`transcribe: Sarvam failure (${name}) → 502 service_error, usage refunded`, async () => {
    const s = await start({ env: { DAILY_STT_SECONDS: '4', IP_STT_PER_10MIN: '99' }, sarvam: resp });
    for (let i = 0; i < 3; i++) { // would hit the 4 s daily cap on the 2nd try if not refunded
      const r = await s.post('/api/transcribe', sine(3), wavHeaders);
      assert.equal(r.status, 502);
      const e = (await r.json()).error;
      assert.equal(e.code, 'service_error'); assert.equal(e.kind, kind);
    }
    await s.close();
  });
}

test('transcribe: per-IP limit and daily seconds cap', async () => {
  const s = await start({ env: { IP_STT_PER_10MIN: '2' }, sarvam: sttOk('ok') });
  const codes = [];
  for (let i = 0; i < 3; i++) { const r = await s.post('/api/transcribe', sine(2), wavHeaders); codes.push(r.status); }
  assert.deepEqual(codes, [200, 200, 429]);
  await s.close();
  const s2 = await start({ env: { DAILY_STT_SECONDS: '5', IP_STT_PER_10MIN: '99' }, sarvam: sttOk('ok') });
  assert.equal((await s2.post('/api/transcribe', sine(3), wavHeaders)).status, 200);
  const r = await s2.post('/api/transcribe', sine(3), wavHeaders);
  assert.equal(r.status, 429); assert.equal((await r.json()).error.code, 'daily_cap');
  await s2.close();
});

test('transcribe: no API key → 503 not_configured', async () => {
  const s = await start({ env: { SARVAM_API_KEY: '' } });
  assert.equal((await s.post('/api/transcribe', sine(2), wavHeaders)).status, 503);
  await s.close();
});

// ---------- /api/speak ----------
const ttsOk = () => json({ audios: [Buffer.from('FAKE-MP3-BYTES').toString('base64')] });

test('speak: returns audio and calls Sarvam TTS with the right parameters', async () => {
  const s = await start({ sarvam: ttsOk });
  const r = await s.post('/api/speak', { text: 'यह एक परीक्षण है।', lang: 'hi' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'audio/mpeg');
  assert.equal(Buffer.from(await r.arrayBuffer()).toString(), 'FAKE-MP3-BYTES');
  const body = JSON.parse(s.calls[0].init.body);
  assert.equal(s.calls[0].url, 'https://api.sarvam.ai/text-to-speech');
  assert.equal(body.language_code, 'hi-IN'); assert.equal(body.model, 'bulbul:v3'); assert.equal(body.output_audio_codec, 'mp3');
  await s.close();
});

test('speak: empty → 400, too long → 413, Sarvam failure → 502 and chars refunded, daily cap → 429', async () => {
  const s = await start({ env: { DAILY_TTS_CHARS: '20', IP_TTS_PER_10MIN: '99' }, sarvam: () => json({}, 500) });
  assert.equal((await s.post('/api/speak', { text: '', lang: 'en' })).status, 400);
  assert.equal((await s.post('/api/speak', { text: 'x'.repeat(500), lang: 'en' })).status, 413);
  for (let i = 0; i < 3; i++) assert.equal((await s.post('/api/speak', { text: 'twelve chars', lang: 'en' })).status, 502); // refunded each time
  await s.close();
  const s2 = await start({ env: { DAILY_TTS_CHARS: '20', IP_TTS_PER_10MIN: '99' }, sarvam: ttsOk });
  assert.equal((await s2.post('/api/speak', { text: 'twelve chars', lang: 'en' })).status, 200);
  assert.equal((await s2.post('/api/speak', { text: 'twelve chars', lang: 'en' })).status, 429);
  await s2.close();
});

// ---------- privacy and security ----------
test('privacy: request text, audio and the API key never appear in server logs or error responses', async () => {
  const SECRET = 'ZXQ-UNIQUE-PHRASE-48151623';
  const s = await start({ sarvam: () => json({ echo: SECRET }, 500) });
  const bodies = [];
  bodies.push(await (await s.post('/api/check', { text: `${SECRET} please share the OTP now`, lang: 'en' })).text());
  bodies.push(await (await s.post('/api/transcribe', sine(2), wavHeaders)).text());
  bodies.push(await (await s.post('/api/speak', { text: SECRET, lang: 'en' })).text());
  bodies.push(await (await s.post('/api/check', '{bad json ' + SECRET)).text());
  const everything = bodies.join('\n') + '\n' + s.logs.join('\n');
  assert.ok(!everything.includes(SECRET), 'user text leaked');
  assert.ok(!everything.includes(FAKE_KEY), 'API key leaked');
  assert.ok(s.logs.length >= 4);
  assert.ok(s.logs.every((l) => /^(GET|POST) \/\S* \d{3} \d+ms$/.test(l)), 'log lines carry only method, path, status, time');
  await s.close();
});

test('security: static server blocks path traversal; API responses are not cached; CSP present', async () => {
  const s = await start();
  for (const p of ['/../server.js', '/..%2fserver.js', '/%2e%2e/package.json', '/..%2f..%2f.env']) {
    const r = await s.get(p);
    assert.ok([403, 404].includes(r.status) || !(await r.text()).includes('createApp'), p);
  }
  const ok = await s.get('/');
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-security-policy'), /default-src 'self'/);
  const api = await s.get('/api/status');
  assert.equal(api.headers.get('cache-control'), 'no-store');
  assert.equal((await api.json()).ai, true);
  await s.close();
});

test('security: oversized JSON body is rejected (413)', async () => {
  const s = await start({ sarvam: aiOk('no_clear_signs') });
  const r = await s.post('/api/check', JSON.stringify({ text: 'a'.repeat(20000), lang: 'en' }));
  assert.equal(r.status, 413);
  await s.close();
});

test('status: reports AI availability without exposing the key', async () => {
  const s = await start();
  const body = await (await s.get('/api/status')).text();
  assert.ok(!body.includes(FAKE_KEY));
  await s.close();
});

test('status: proxy diagnostic is off by default and reports only a count when enabled', async () => {
  const s = await start();
  assert.equal((await (await s.get('/api/status')).json()).proxyEntries, undefined);
  await s.close();
  const d = await start({ env: { DEBUG_IP_DIAG: '1' } });
  const r = await (await fetch(d.base + '/api/status', { headers: { 'x-forwarded-for': '9.9.9.9, 8.8.8.8' } })).json();
  assert.equal(r.proxyEntries, 2);
  assert.ok(!JSON.stringify(r).includes('9.9.9.9'));
  await d.close();
});
