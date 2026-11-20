import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, loadConfig } from './src/config.js';
import { createLimiter, clientIp } from './src/limits.js';
import { createSarvam, SarvamError } from './src/sarvam.js';
import { analyze } from './src/analyze.js';
import { inspectWav } from './src/wav.js';
import { HttpError } from './src/http-error.js';
import { createLive } from './src/live.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon',
};
const CSP = "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

async function readBody(req, limit) {
  const declared = Number(req.headers['content-length']);
  if (declared > limit) throw new HttpError(413, 'too_large');
  const chunks = []; let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'too_large');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

/**
 * Build the request handler. `fetchImpl` and `now` are injectable so tests can simulate
 * Sarvam failures and the clock without network access.
 */
export function createApp({ env = process.env, fetchImpl = fetch, now = Date.now, log = () => {} } = {}) {
  const cfg = loadConfig(env);
  const limiter = createLimiter({ now, daily: cfg.daily });
  const sweeper = setInterval(() => limiter.sweep(), 10 * 60 * 1000); sweeper.unref();
  const sarvam = cfg.apiKey ? createSarvam({ apiKey: cfg.apiKey, baseUrl: cfg.sarvamBase, fetchImpl, timeouts: cfg.timeouts }) : null;
  let inflight = 0;
  const live = createLive({ sarvam, limiter, cfg, now });
  const liveSweeper = setInterval(() => live.sweep(), 60 * 1000); liveSweeper.unref();

  const send = (res, status, body, headers = {}) => {
    const isBuf = Buffer.isBuffer(body);
    res.writeHead(status, {
      'content-type': isBuf ? headers['content-type'] : 'application/json; charset=utf-8',
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
      'content-security-policy': CSP, 'permissions-policy': 'microphone=(self), camera=(), geolocation=()', ...headers,
    });
    res.end(isBuf ? body : JSON.stringify(body));
  };
  const err = (res, status, code, extra = {}) => send(res, status, { error: { code, ...extra } });

  async function handleCheck(req, res, ip) {
    let body;
    try { body = JSON.parse((await readBody(req, 8 * 1024)).toString('utf8')); } catch (e) {
      if (e instanceof HttpError) throw e; throw new HttpError(400, 'bad_json');
    }
    const lang = body?.lang === 'hi' ? 'hi' : 'en';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) throw new HttpError(400, 'empty_text');
    if (text.length > cfg.maxTextChars) throw new HttpError(413, 'text_too_long', { max: cfg.maxTextChars });

    // Decide whether the AI may be used. If not, the rule-based limited check still runs, clearly labelled.
    let limitedReason = null;
    if (!sarvam) limitedReason = 'not_configured';
    else {
      const a = limiter.hit(ip, 'checks10', cfg.perIp.checks10, 10 * 60 * 1000);
      const b = a.ok ? limiter.hit(ip, 'checksDay', cfg.perIp.checksDay, 24 * 3600 * 1000) : a;
      if (!a.ok || !b.ok) limitedReason = 'rate_limited';
      else if (inflight >= 6) limitedReason = 'busy';
      else if (!limiter.take('checks', 1)) limitedReason = 'daily_cap';
    }
    const useAi = sarvam && !limitedReason;
    if (useAi) inflight++;
    try {
      const result = await analyze({ text, lang, sarvam: useAi ? sarvam : null, limitedReason });
      send(res, 200, result);
    } finally { if (useAi) inflight--; }
  }

  async function handleTranscribe(req, res, ip) {
    if (!sarvam) throw new HttpError(503, 'not_configured');
    const ct = String(req.headers['content-type'] || '');
    if (!ct.startsWith('audio/wav') && !ct.startsWith('audio/x-wav')) throw new HttpError(415, 'bad_audio');
    const limit = (cfg.maxAudioSeconds + 1) * 16000 * 2 + 4096;
    const buf = await readBody(req, limit);
    const info = inspectWav(buf, cfg.maxAudioSeconds);
    if (!info.ok) throw new HttpError(422, info.code); // too_short / silent / too_long / bad_audio: no credits spent
    const r = limiter.hit(ip, 'stt10', cfg.perIp.stt10, 10 * 60 * 1000);
    if (!r.ok) throw new HttpError(429, 'rate_limited', { retryAfterSec: r.retryAfterSec });
    const secs = Math.ceil(info.seconds);
    if (!limiter.take('stt_seconds', secs)) throw new HttpError(429, 'daily_cap');
    try {
      const out = await sarvam.stt(buf);
      if (!out.transcript) throw new HttpError(422, 'no_speech');
      send(res, 200, { transcript: out.transcript.slice(0, cfg.maxTextChars), languageCode: out.languageCode });
    } catch (e) {
      if (e instanceof SarvamError) { limiter.refund('stt_seconds', secs); throw new HttpError(502, 'service_error', { kind: e.kind }); }
      throw e;
    }
  }

  async function handleSpeak(req, res, ip) {
    if (!sarvam) throw new HttpError(503, 'not_configured');
    let body;
    try { body = JSON.parse((await readBody(req, 4 * 1024)).toString('utf8')); } catch (e) {
      if (e instanceof HttpError) throw e; throw new HttpError(400, 'bad_json');
    }
    const lang = body?.lang === 'hi' ? 'hi' : 'en';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) throw new HttpError(400, 'empty_text');
    if (text.length > cfg.maxSpeakChars) throw new HttpError(413, 'text_too_long', { max: cfg.maxSpeakChars });
    const r = limiter.hit(ip, 'tts10', cfg.perIp.tts10, 10 * 60 * 1000);
    if (!r.ok) throw new HttpError(429, 'rate_limited', { retryAfterSec: r.retryAfterSec });
    if (!limiter.take('tts_chars', text.length)) throw new HttpError(429, 'daily_cap');
    try {
      const out = await sarvam.tts(text, lang);
      send(res, 200, out.buffer, { 'content-type': out.mime });
    } catch (e) {
      if (e instanceof SarvamError) { limiter.refund('tts_chars', text.length); throw new HttpError(502, 'service_error', { kind: e.kind }); }
      throw e;
    }
  }


  async function handleLive(req, res, ip, url) {
    const code = String(req.headers['x-session-code'] || url.searchParams.get('code') || '').trim().toUpperCase();
    const p = url.pathname;
    if (req.method === 'POST' && p === '/api/live/create') {
      let body = {};
      try { body = JSON.parse((await readBody(req, 2 * 1024)).toString('utf8') || '{}'); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'bad_json'); }
      return send(res, 200, live.create(body?.lang, ip));
    }
    if (req.method === 'GET' && p === '/api/live/state') return send(res, 200, live.state(code, ip));
    if (req.method === 'GET' && p === '/api/live/stream') {
      live.canAttach(code, ip); // may throw (unknown code / too many viewers) before any header is written
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive',
        'x-accel-buffering': 'no', 'x-content-type-options': 'nosniff', 'content-security-policy': CSP });
      live.addClient(code, ip, res);
      return;
    }
    if (req.method === 'POST' && p === '/api/live/chunk') {
      const ct = String(req.headers['content-type'] || '');
      if (!ct.startsWith('audio/wav') && !ct.startsWith('audio/x-wav')) throw new HttpError(415, 'bad_audio');
      const buf = await readBody(req, (cfg.live.chunkMaxSeconds + 1) * 16000 * 2 + 4096);
      return send(res, 200, await live.ingest(code, buf, ip));
    }
    if (req.method === 'POST' && p === '/api/live/end') return send(res, 200, live.end(code, ip));
    throw new HttpError(404, 'not_found');
  }

  function serveStatic(req, res) {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    if (p === '/guard') p = '/guard.html';
    if (p === '/listen') p = '/listen.html';
    const file = path.normalize(path.join(PUBLIC, p));
    if (!file.startsWith(PUBLIC + path.sep)) return err(res, 404, 'not_found');
    fs.readFile(file, (e, data) => {
      if (e) return err(res, 404, 'not_found');
      send(res, 200, data, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': p.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    });
  }

  const handler = async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url, 'http://x');
    const ip = clientIp(req, cfg.trustProxyHops);
    try {
      if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
      if (req.method === 'GET' && url.pathname === '/api/status') {
        const out = { ai: Boolean(sarvam), maxAudioSeconds: cfg.maxAudioSeconds, maxTextChars: cfg.maxTextChars };
        // Off by default. When DEBUG_IP_DIAG=1, reports only HOW MANY proxy entries arrive (never the addresses),
        // so the right TRUST_PROXY_HOPS can be measured on the real host.
        if (env.DEBUG_IP_DIAG === '1') {
          const entries = String(req.headers['x-forwarded-for'] || '').split(',').map((x) => x.trim()).filter(Boolean);
          out.proxyEntries = entries.length;
          // The caller may pass their own address as ?me=; we report only which position from the right matches it.
          const me = url.searchParams.get('me');
          if (me) { const i = entries.lastIndexOf(me); out.proxyMatchFromRight = i < 0 ? 0 : entries.length - i; } // 0 = no match
        }
        return send(res, 200, out);
      }
      if (url.pathname.startsWith('/api/live/')) return await handleLive(req, res, ip, url);
      if (req.method === 'POST' && url.pathname === '/api/check') return await handleCheck(req, res, ip);
      if (req.method === 'POST' && url.pathname === '/api/transcribe') return await handleTranscribe(req, res, ip);
      if (req.method === 'POST' && url.pathname === '/api/speak') return await handleSpeak(req, res, ip);
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
      return err(res, 405, 'method_not_allowed');
    } catch (e) {
      if (res.headersSent) { try { res.end(); } catch { /* already closed */ } return; }
      if (e instanceof HttpError) {
        const headers = e.extra?.retryAfterSec ? { 'retry-after': String(e.extra.retryAfterSec) } : {};
        return send(res, e.status, { error: { code: e.code, ...e.extra } }, headers);
      }
      return err(res, 500, 'internal_error'); // message deliberately generic: never echo request content
    } finally {
      // Privacy: log only method, path, status and timing. Never bodies, text, audio, headers or IPs.
      log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  };
  return { handler, limiter, live, config: cfg };
}

// ---- start (only when run directly) ----
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadDotEnv();
  const app = createApp({ log: (l) => console.log(l) });
  http.createServer(app.handler).listen(app.config.port, () => {
    console.log(`Rakshak listening on :${app.config.port} · AI ${app.config.apiKey ? 'enabled' : 'NOT configured (limited checks only)'}`);
  });
}
