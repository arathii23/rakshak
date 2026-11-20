import test from 'node:test';
import assert from 'node:assert/strict';
import { toWav16k } from '../public/wav-encode.js';
import { inspectWav } from '../src/wav.js';

const sineChunks = (rate, secs, amp = 0.3, chunk = 4096) => {
  const total = Math.floor(rate * secs); const all = new Float32Array(total);
  for (let i = 0; i < total; i++) all[i] = amp * Math.sin((2 * Math.PI * 300 * i) / rate);
  const chunks = []; for (let i = 0; i < total; i += chunk) chunks.push(all.slice(i, i + chunk));
  return chunks;
};
const toBuf = async (blob) => Buffer.from(await blob.arrayBuffer());

for (const rate of [48000, 44100, 16000]) {
  test(`recorder WAV encoder: ${rate} Hz input → valid 16 kHz mono WAV accepted by the server validator`, async () => {
    const wav = await toBuf(toWav16k(sineChunks(rate, 3), rate));
    const info = inspectWav(wav, 20);
    assert.equal(info.ok, true, JSON.stringify(info));
    assert.ok(Math.abs(info.seconds - 3) < 0.05, `duration ${info.seconds}`);
    assert.ok(info.rms > 1000, `rms ${info.rms}`);
  });
}

test('recorder WAV encoder: silence is rejected by the validator as silent', async () => {
  const wav = await toBuf(toWav16k(sineChunks(48000, 3, 0), 48000));
  assert.equal(inspectWav(wav, 20).code, 'silent');
});

test('recorder WAV encoder: a very short recording is rejected as too_short', async () => {
  const wav = await toBuf(toWav16k(sineChunks(48000, 0.3), 48000));
  assert.equal(inspectWav(wav, 20).code, 'too_short');
});
