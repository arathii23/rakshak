// Live Guard: a second device near a speakerphone call sends short audio chunks; the server transcribes
// them (Sarvam), keeps a short rolling transcript IN MEMORY ONLY, analyses it, and streams the state to
// the family's phone. Nothing is written to disk or logged. Transcripts are wiped when the session ends
// or expires. This is NOT call monitoring on the phone itself and it cannot block calls.

import crypto from 'node:crypto';
import { inspectWav } from './wav.js';
import { SarvamError } from './sarvam.js';
import { analyze } from './analyze.js';
import { HttpError } from './http-error.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no I/O/0/1
export const makeCode = () => Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % 32]).join('');
const SEV = { not_enough_info: 0, no_clear_signs: 0, warning_signs: 1, likely_scam: 2 };
const WINDOW = 900;      // characters of recent transcript that are analysed
const VISIBLE = 600;     // characters of recent transcript shown to the family
const KEEP = 4000;       // hard cap on transcript kept in memory

export function createLive({ sarvam, limiter, cfg, now = Date.now }) {
  const sessions = new Map();

  const tail = (text, n) => {
    if (text.length <= n) return text;
    const cut = text.slice(-n);
    return cut.replace(/^\S*\s/, ''); // do not start mid-word
  };

  function publicState(s) {
    const t = now();
    const visible = tail(s.text, VISIBLE);
    return {
      status: s.status, lang: s.lang,
      listeningSeconds: Math.round(s.sttSeconds), chunks: s.chunks,
      listenerSeenAgoSec: s.lastChunkAt ? Math.round((t - s.lastChunkAt) / 1000) : null,
      latest: { text: visible, highlights: s.visibleHighlights },
      alert: s.alert, alertSeq: s.alertSeq, alertLevel: s.alertLevel, finalLevel: s.finalLevel,
      note: s.aiNote ? { ai: s.aiNote } : null, sttError: s.sttError, capped: s.capped, dailyCap: s.dailyCap,
      secondsLeft: Math.max(0, Math.round(cfg.live.sessionMaxSeconds - s.sttSeconds)),
    };
  }
  function broadcast(s) {
    const data = `data: ${JSON.stringify(publicState(s))}\n\n`;
    for (const res of s.clients) { try { res.write(data); } catch { s.clients.delete(res); } }
  }
  function get(code, ip) {
    const s = sessions.get(String(code || '').toUpperCase());
    if (!s) {
      const r = limiter.hit(ip, 'badcode', cfg.live.badCode10, 10 * 60 * 1000);
      if (!r.ok) throw new HttpError(429, 'rate_limited', { retryAfterSec: r.retryAfterSec });
      throw new HttpError(404, 'no_such_session');
    }
    return s;
  }

  function create(lang, ip) {
    if (!sarvam) throw new HttpError(503, 'not_configured');
    const r = limiter.hit(ip, 'livecreate', cfg.live.createPerHour, 3600 * 1000);
    if (!r.ok) throw new HttpError(429, 'rate_limited', { retryAfterSec: r.retryAfterSec });
    sweep();
    if ([...sessions.values()].filter((s) => s.status !== 'ended').length >= cfg.live.maxSessions) throw new HttpError(503, 'busy');
    let code; do { code = makeCode(); } while (sessions.has(code));
    const s = {
      code, lang: lang === 'hi' ? 'hi' : 'en', created: now(), lastSeen: now(), status: 'waiting', text: '', chunks: 0,
      sttSeconds: 0, aiCalls: 0, aiBusy: false, lastAiText: '', lastAiScore: 0, aiNote: null, alert: null, alertSeq: 0,
      alertLevel: 'none', finalLevel: null, sttError: null, capped: false, dailyCap: false, lastChunkAt: null,
      visibleHighlights: [], clients: new Set(), busy: false,
    };
    sessions.set(code, s);
    return { code };
  }

  function state(code, ip) { return publicState(get(code, ip)); }

  /** Validate a viewer BEFORE any response headers are written. */
  function canAttach(code, ip) {
    const s = get(code, ip);
    if (s.clients.size >= 6) throw new HttpError(429, 'too_many_viewers');
    return s;
  }
  function addClient(code, ip, res) {
    const s = canAttach(code, ip);
    s.clients.add(res);
    s.lastSeen = now();
    res.write(`retry: 3000\n\ndata: ${JSON.stringify(publicState(s))}\n\n`);
    const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* closed */ } }, 15000);
    hb.unref?.();
    res.on('close', () => { clearInterval(hb); s.clients.delete(res); });
  }

  async function ingest(code, buf, ip) {
    const s = get(code, ip);
    if (s.status === 'ended') throw new HttpError(410, 'session_ended');
    s.lastSeen = now();
    const info = inspectWav(buf, cfg.live.chunkMaxSeconds);
    if (!info.ok) {
      if (info.code === 'silent' || info.code === 'too_short') {
        // Silence between sentences is normal. No cost, no error.
        s.lastChunkAt = now(); if (s.status === 'waiting') s.status = 'listening';
        broadcast(s);
        return { ok: true, skipped: info.code, alertSeq: s.alertSeq, alertLevel: s.alertLevel, status: s.status };
      }
      throw new HttpError(422, info.code);
    }
    const r = limiter.hit(ip, 'livechunk', cfg.perIp.liveChunk1m, 60 * 1000);
    if (!r.ok) throw new HttpError(429, 'rate_limited', { retryAfterSec: r.retryAfterSec });
    if (s.sttSeconds + info.seconds > cfg.live.sessionMaxSeconds) {
      s.capped = true; broadcast(s);
      throw new HttpError(429, 'session_cap');
    }
    if (s.busy) throw new HttpError(429, 'busy'); // one chunk at a time per session
    const secs = Math.ceil(info.seconds);
    if (!limiter.take('stt_seconds', secs)) { s.dailyCap = true; broadcast(s); throw new HttpError(429, 'daily_cap'); }

    s.busy = true;
    try {
      let heard;
      try { heard = (await sarvam.stt(buf)).transcript; } catch (e) {
        limiter.refund('stt_seconds', secs);
        if (e instanceof SarvamError) { s.sttError = e.kind; broadcast(s); throw new HttpError(502, 'service_error', { kind: e.kind }); }
        throw e;
      }
      s.sttError = null; s.dailyCap = false;
      s.lastChunkAt = now(); if (s.status === 'waiting') s.status = 'listening';
      s.sttSeconds += info.seconds; s.chunks++;
      if (!heard) { broadcast(s); return { ok: true, heard: false, alertSeq: s.alertSeq, alertLevel: s.alertLevel, status: s.status }; }
      s.text = (s.text + ' ' + heard).trim().slice(-KEEP);

      const window = tail(s.text, WINDOW);
      const words = window.split(/\s+/).length;
      const rulesOnly = await analyze({ text: window, lang: s.lang, sarvam: null, limitedReason: 'live_rules_only' });
      const rulesScore = rulesOnly.highlights.filter((h) => h.kind === 'strong').length;
      let result = rulesOnly;

      const wantAi = !s.aiBusy && s.aiCalls < cfg.live.aiPerSession && window !== s.lastAiText && words >= 6
        && (s.aiCalls === 0 || s.chunks % 2 === 0 || rulesScore > s.lastAiScore);
      if (wantAi && limiter.take('checks', 1)) {
        s.aiBusy = true;
        try {
          const ai = await analyze({ text: window, lang: s.lang, sarvam });
          s.aiCalls++; s.lastAiText = window; s.lastAiScore = rulesScore;
          if (ai.limited) s.aiNote = ai.limitedReason; else { s.aiNote = null; result = ai; }
        } finally { s.aiBusy = false; }
      }

      const vis = tail(s.text, VISIBLE);
      s.visibleHighlights = (await analyze({ text: vis, lang: s.lang, sarvam: null, limitedReason: 'live_view' })).highlights;

      // The alert only ever goes up during a call; it never quietly returns to "fine".
      const up = SEV[result.verdict] > (SEV[s.alertLevel] ?? -1) && SEV[result.verdict] > 0;
      const refine = s.alert && SEV[result.verdict] === SEV[s.alertLevel] && result.source === 'ai' && s.alert.source !== 'ai';
      if (up || refine) {
        s.alert = { ...result, text: window, atSeconds: Math.round(s.sttSeconds) };
        if (up) { s.alertSeq++; s.alertLevel = result.verdict; }
      }
      broadcast(s);
      return { ok: true, alertSeq: s.alertSeq, alertLevel: s.alertLevel, status: s.status };
    } finally { s.busy = false; }
  }

  function end(code, ip) {
    const s = get(code, ip);
    wipe(s);
    broadcast(s);
    for (const res of s.clients) { try { res.end(); } catch { /* ignore */ } }
    s.clients.clear();
    return { ok: true };
  }
  function wipe(s) {
    s.finalLevel = s.alertLevel === 'none' ? 'none' : s.alertLevel;
    s.status = 'ended'; s.text = ''; s.alert = null; s.visibleHighlights = []; s.lastAiText = ''; s.endedAt = now();
  }

  function sweep() {
    const t = now();
    for (const [code, s] of sessions) {
      const idle = t - s.lastSeen > cfg.live.idleMs;
      const old = t - s.created > cfg.live.maxAgeMs;
      if (s.status !== 'ended' && (idle || old)) { wipe(s); broadcast(s); for (const res of s.clients) { try { res.end(); } catch { /* */ } } s.clients.clear(); }
      if (s.status === 'ended' && t - s.endedAt > 5 * 60 * 1000) sessions.delete(code);
    }
  }

  return { create, state, canAttach, addClient, ingest, end, sweep, _sessions: sessions };
}
