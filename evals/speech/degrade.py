"""Make a clean 16 kHz voice recording sound like a phone call heard from a speakerphone in a room: 8 kHz phone line
(300-3400 Hz, 8-bit mu-law), a little room echo, and background noise at a given signal-to-noise ratio.
usage: python3 -I degrade.py in.wav out.wav SNR_dB RT60_seconds SEED"""
import sys
import numpy as np
import scipy.signal as ss
import scipy.io.wavfile as wf

src, dst, snr_db, rt60, seed = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
rate, x = wf.read(src)
x = x.astype(np.float64) / 32768.0
if x.ndim > 1:
    x = x.mean(axis=1)
rng = np.random.default_rng(seed)

x8 = ss.resample_poly(x, 8000, rate)
sos = ss.butter(4, [300, 3400], btype="band", fs=8000, output="sos")
x8 = ss.sosfilt(sos, x8)
peak = np.max(np.abs(x8)) + 1e-9
xn = x8 / peak
mu = 255.0
y = np.sign(xn) * np.log1p(mu * np.abs(xn)) / np.log1p(mu)
yq = np.round(y * 127) / 127
x8 = np.sign(yq) * ((1 + mu) ** np.abs(yq) - 1) / mu * peak
y16 = ss.resample_poly(x8, 2, 1)

n = int(rt60 * 16000)
t = np.arange(n) / 16000.0
ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt60)
ir[0] = 0
y16 = y16 + ss.fftconvolve(y16, ir * 0.08)[: len(y16)]

w = rng.standard_normal(len(y16) + 4000)
b, a = ss.butter(1, 0.2)
noise = ss.lfilter(b, a, w)[4000:]
sp = np.sqrt(np.mean(y16 ** 2))
npow = np.sqrt(np.mean(noise ** 2))
noise = noise * (sp / (npow + 1e-9)) / (10 ** (snr_db / 20.0))
out = y16 + noise
out = out / (np.max(np.abs(out)) + 1e-9) * 0.5
wf.write(dst, 16000, (out * 32767).astype(np.int16))
