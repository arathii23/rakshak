// Dev-only: runs the app on :8788 against a FAKE local Sarvam (no network, no credits) so the UI's
// AI-mode paths (voice, read aloud, failures) can be exercised by hand. Not used in production.
import http from 'node:http';
import { createApp } from '../server.js';
import { makeWav, RATE } from '../src/wav.js';

const tone = makeWav(Int16Array.from({ length: RATE / 2 }, (_, i) => Math.round(6000 * Math.sin((2 * Math.PI * 440 * i) / RATE))));
let mode = 'ok'; // switch with GET /__mode/<ok|fail|slow>

http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const reply = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (req.url.startsWith('/__mode/')) { mode = req.url.split('/')[2]; return reply(200, { mode }); }
  if (mode === 'fail') return reply(500, { error: 'fake outage' });
  if (mode === 'slow') await new Promise((r) => setTimeout(r, 4000));
  if (req.url === '/v1/chat/completions') {
    const user = JSON.parse(Buffer.concat(chunks).toString()).messages[1].content;
    const hit = /otp|digital arrest|anydesk/i.test(user);
    return reply(200, { choices: [{ message: { content: JSON.stringify({ verdict: hit ? 'warning_signs' : 'no_clear_signs', quotes: [], explanation: 'FAKE-AI explanation for UI testing.' }) } }] });
  }
  if (req.url === '/speech-to-text') return reply(200, { transcript: 'Aapka OTP bata dijiye abhi', language_code: 'hi-IN' });
  if (req.url === '/text-to-speech') return reply(200, { audios: [tone.toString('base64')] });
  reply(404, {});
}).listen(9099, '127.0.0.1');

const app = createApp({ env: { SARVAM_API_KEY: 'fake', SARVAM_BASE_URL: 'http://127.0.0.1:9099', PORT: '8788' }, log: () => {} });
http.createServer(app.handler).listen(8788, () => console.log('fake-sarvam dev app on :8788'));
