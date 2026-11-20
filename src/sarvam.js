// Minimal Sarvam REST client. The API key stays on the server. Errors carry only a category,
// never the response body (which could echo user text) and never the key.

export class SarvamError extends Error {
  constructor(kind, status) {
    super(kind);
    this.name = 'SarvamError';
    this.kind = kind; // timeout | network | rate_limited | quota | auth | server | bad_request | bad_response
    this.status = status;
  }
}

const kindFor = (status) =>
  status === 429 ? 'rate_limited' : status === 402 ? 'quota' : status === 401 || status === 403 ? 'auth'
    : status >= 500 ? 'server' : 'bad_request';

export function createSarvam({ apiKey, baseUrl = 'https://api.sarvam.ai', fetchImpl = fetch, timeouts = {} }) {
  async function request(path, init, timeoutMs, parse) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res;
      try {
        res = await fetchImpl(baseUrl + path, { ...init, signal: ctrl.signal, headers: { ...(init.headers || {}), 'api-subscription-key': apiKey } });
      } catch (e) {
        throw new SarvamError(e?.name === 'AbortError' ? 'timeout' : 'network');
      }
      if (!res.ok) throw new SarvamError(kindFor(res.status), res.status);
      try {
        return await parse(res);
      } catch (e) {
        if (e instanceof SarvamError) throw e;
        throw new SarvamError(e?.name === 'AbortError' ? 'timeout' : 'bad_response');
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /**
     * Chat completion → message content string.
     * `onUsage(usage, meta)` is optional and only used by the accuracy evaluation to count tokens; `usage` holds
     * numbers only (never text). `temperature` defaults to 0.1.
     */
    async chat({ system, user, schema, maxTokens = 450, temperature = 0.1, onUsage }) {
      const body = {
        model: 'sarvam-105b-conversations',
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      };
      if (schema) body.response_format = { type: 'json_schema', json_schema: { name: 'check', strict: true, schema } };
      return request('/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }, timeouts.chat ?? 15000, async (res) => {
        const j = await res.json();
        const c = j?.choices?.[0]?.message?.content;
        if (typeof onUsage === 'function') {
          try { onUsage(j?.usage ?? null, { finish: j?.choices?.[0]?.finish_reason ?? null }); } catch { /* accounting must never break a check */ }
        }
        if (typeof c !== 'string' || !c.trim()) throw new SarvamError('bad_response');
        return c;
      });
    },

    /** Speech to text for a short 16 kHz mono WAV (Buffer). */
    async stt(wavBuffer) {
      const form = new FormData();
      form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'speech.wav');
      form.append('model', 'saaras:v4');
      form.append('mode', 'codemix');
      form.append('language_code', 'unknown');
      return request('/speech-to-text', { method: 'POST', body: form }, timeouts.stt ?? 25000, async (res) => {
        const j = await res.json();
        if (typeof j?.transcript !== 'string') throw new SarvamError('bad_response');
        return { transcript: j.transcript.trim(), languageCode: j.language_code || null };
      });
    },

    /** Text to speech → { buffer, mime }. */
    async tts(text, lang) {
      const body = {
        text, language_code: lang === 'hi' ? 'hi-IN' : 'en-IN', model: 'bulbul:v3', speaker: 'priya',
        pace: 0.95, speech_sample_rate: 22050, output_audio_codec: 'mp3',
      };
      return request('/text-to-speech', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }, timeouts.tts ?? 20000, async (res) => {
        const j = await res.json();
        const b64 = j?.audios?.[0];
        if (typeof b64 !== 'string' || !b64) throw new SarvamError('bad_response');
        return { buffer: Buffer.from(b64, 'base64'), mime: 'audio/mpeg' };
      });
    },
  };
}
