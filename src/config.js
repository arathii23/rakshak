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
    daily: {
      checks: num(env.DAILY_AI_CHECKS, 250),
      stt_seconds: num(env.DAILY_STT_SECONDS, 1200),
      tts_chars: num(env.DAILY_TTS_CHARS, 8000),
    },
    perIp: {
      checks10: num(env.IP_CHECKS_PER_10MIN, 10), checksDay: num(env.IP_CHECKS_PER_DAY, 40),
      stt10: num(env.IP_STT_PER_10MIN, 5), tts10: num(env.IP_TTS_PER_10MIN, 6),
    },
  };
}
