// Validate the recording before spending any credits: must be a 16 kHz mono 16-bit PCM WAV,
// long enough, short enough, and not silent. Pure functions, nothing is stored.

export const RATE = 16000;
const MIN_SECONDS = 0.7;
const SILENCE_RMS = 80; // int16 RMS below this is treated as silence (speech is typically 500+)

export function inspectWav(buf, maxSeconds = 20) {
  if (!Buffer.isBuffer(buf) || buf.length < 44) return { ok: false, code: 'bad_audio' };
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return { ok: false, code: 'bad_audio' };
  let pos = 12, fmt = null, dataStart = -1, dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(pos + 8), channels: buf.readUInt16LE(pos + 10), rate: buf.readUInt32LE(pos + 12), bits: buf.readUInt16LE(pos + 22) };
    if (id === 'data') { dataStart = pos + 8; dataLen = Math.min(size, buf.length - dataStart); break; }
    pos += 8 + size + (size % 2);
  }
  if (!fmt || dataStart < 0) return { ok: false, code: 'bad_audio' };
  if (fmt.format !== 1 || fmt.channels !== 1 || fmt.rate !== RATE || fmt.bits !== 16) return { ok: false, code: 'bad_audio' };
  const samples = Math.floor(dataLen / 2);
  const seconds = samples / RATE;
  if (seconds < MIN_SECONDS) return { ok: false, code: 'too_short', seconds };
  if (seconds > maxSeconds + 1) return { ok: false, code: 'too_long', seconds };
  let sum = 0;
  for (let i = 0; i < samples; i++) { const v = buf.readInt16LE(dataStart + i * 2); sum += v * v; }
  const rms = Math.sqrt(sum / samples);
  if (rms < SILENCE_RMS) return { ok: false, code: 'silent', seconds, rms };
  return { ok: true, seconds, rms };
}

/** Build a 16 kHz mono WAV from Int16 samples (used by tests). */
export function makeWav(int16) {
  const data = Buffer.alloc(int16.length * 2);
  int16.forEach((v, i) => data.writeInt16LE(v, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
