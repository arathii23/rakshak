// Continuous microphone capture that emits a 16 kHz mono WAV Blob every `chunkSeconds`.
// Used by the parent-device page (Live Guard). Nothing is stored in the browser.
import { toWav16k } from './wav-encode.js';

export async function startChunkRecorder({ chunkSeconds = 8, onChunk, onLevel }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Echo cancellation and noise suppression are off on purpose: they can mute the other person's voice
    // when it comes out of a nearby speaker.
    audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  });
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const rate = ctx.sampleRate;
  let chunks = []; let samples = 0; let stopped = false;

  const flush = (final) => {
    const secs = samples / rate;
    if (!chunks.length || (final && secs < 1.5)) { chunks = []; samples = 0; return; }
    const blob = toWav16k(chunks, rate); chunks = []; samples = 0;
    try { onChunk(blob); } catch { /* the page handles its own errors */ }
  };

  proc.onaudioprocess = (e) => {
    if (stopped) return;
    const data = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(data); samples += data.length;
    let sum = 0; for (let i = 0; i < data.length; i += 8) sum += data[i] * data[i];
    onLevel?.(Math.min(1, Math.sqrt(sum / (data.length / 8)) * 6));
    if (samples >= rate * chunkSeconds) flush(false);
  };
  src.connect(proc); proc.connect(ctx.destination);

  return {
    stop() {
      if (stopped) return; stopped = true;
      flush(true);
      try { proc.disconnect(); src.disconnect(); } catch { /* ignore */ }
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
    get sampleRate() { return rate; },
  };
}
