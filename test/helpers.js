import http from 'node:http';
import { createApp } from '../server.js';

export const FAKE_KEY = 'test-key-NOT-REAL-123';

/** Build a Response with JSON body. */
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

/** Sarvam chat reply carrying `content` as the model message. */
export const chatReply = (content) => json({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] });

/** Start the app on a random port with a stubbed Sarvam. `sarvam(url, init)` returns a Response. */
export async function start({ env = {}, sarvam, now } = {}) {
  const calls = [];
  const logs = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (!sarvam) throw new Error('unexpected Sarvam call');
    return sarvam(String(url), init, calls.length);
  };
  const app = createApp({ env: { SARVAM_API_KEY: FAKE_KEY, ...env }, fetchImpl, now, log: (l) => logs.push(l) });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base, calls, logs, app,
    close: () => new Promise((r) => server.close(r)),
    post: (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body) }),
    get: (path) => fetch(base + path),
  };
}

export const aiOk = (verdict, quotes = [], explanation = 'Explanation.') => () => chatReply({ verdict, quotes, explanation });
