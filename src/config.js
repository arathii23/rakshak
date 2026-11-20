import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Load .env into process.env (without overriding real env vars). Never logs values. */
export function loadDotEnv(file = path.join(ROOT, '.env')) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch { /* no .env is fine (production uses real env vars) */ }
}

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

export function loadConfig(env = process.env) {
  return {
    port: num(env.PORT, 8787),
    apiKey: env.SARVAM_API_KEY || '',
    sarvamBase: env.SARVAM_BASE_URL || 'https://api.sarvam.ai',
    trustProxyHops: num(env.TRUST_PROXY_HOPS, 1),
    maxTextChars: num(env.MAX_TEXT_CHARS, 1000),
    maxSpeakChars: num(env.MAX_SPEAK_CHARS, 450),
    maxAudioSeconds: num(env.MAX_AUDIO_SECONDS, 20),
    timeouts: { chat: num(env.CHAT_TIMEOUT_MS, 15000), stt: num(env.STT_TIMEOUT_MS, 25000), tts: num(env.TTS_TIMEOUT_MS, 20000) },
    live: {
      sessionMaxSeconds: num(env.LIVE_SESSION_MAX_SECONDS, 900), // 15 min of speech per session
      chunkMaxSeconds: num(env.LIVE_CHUNK_MAX_SECONDS, 12),
      maxSessions: num(env.LIVE_MAX_SESSIONS, 20),
      aiPerSession: num(env.LIVE_AI_PER_SESSION, 15),
      createPerHour: num(env.LIVE_CREATE_PER_HOUR, 4),
      badCode10: num(env.LIVE_BAD_CODE_PER_10MIN, 10),
      idleMs: num(env.LIVE_IDLE_MS, 15 * 60 * 1000),
      maxAgeMs: num(env.LIVE_MAX_AGE_MS, 45 * 60 * 1000),
    },
    daily: {
      checks: num(env.DAILY_AI_CHECKS, 250),
      stt_seconds: num(env.DAILY_STT_SECONDS, 1200),
      tts_chars: num(env.DAILY_TTS_CHARS, 8000),
    },
    perIp: {
      checks10: num(env.IP_CHECKS_PER_10MIN, 10), checksDay: num(env.IP_CHECKS_PER_DAY, 40),
      stt10: num(env.IP_STT_PER_10MIN, 5), tts10: num(env.IP_TTS_PER_10MIN, 6), liveChunk1m: num(env.IP_LIVE_CHUNKS_PER_MIN, 12),
    },
  };
}
