// In-memory rate limits and daily usage caps. Nothing is written to disk and no request content is kept.
// Caveat: counters reset when the process restarts (Render free tier restarts after idling), so the
// real hard stop is the credit balance in your Sarvam dashboard. These limits just make abuse costly.

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
export const dayKey = (nowMs) => new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);

export function createLimiter({ now = Date.now, daily = {} } = {}) {
  const windows = new Map(); // `${bucket}|${ip}` -> timestamps
  let day = dayKey(now());
  let used = {}; // kind -> amount used today

  const rollDay = () => {
    const k = dayKey(now());
    if (k !== day) { day = k; used = {}; }
  };

  /** Sliding-window per-IP limit. Returns {ok, retryAfterSec}. */
  function hit(ip, bucket, max, windowMs) {
    const t = now();
    const key = `${bucket}|${ip}`;
    const arr = (windows.get(key) || []).filter((x) => t - x < windowMs);
    if (arr.length >= max) {
      windows.set(key, arr);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (t - arr[0])) / 1000)) };
    }
    arr.push(t);
    windows.set(key, arr);
    return { ok: true };
  }

  /** Daily global cap. Returns true if `amount` fits and records it. */
  function take(kind, amount = 1) {
    rollDay();
    const cap = daily[kind];
    if (cap === undefined) return true;
    if ((used[kind] || 0) + amount > cap) return false;
    used[kind] = (used[kind] || 0) + amount;
    return true;
  }
  function refund(kind, amount = 1) {
    rollDay();
    used[kind] = Math.max(0, (used[kind] || 0) - amount);
  }
  function snapshot() {
    rollDay();
    return { day, used: { ...used }, caps: { ...daily } };
  }
  function sweep() {
    const t = now();
    for (const [k, arr] of windows) {
      const fresh = arr.filter((x) => t - x < 24 * 3600 * 1000);
      if (fresh.length) windows.set(k, fresh); else windows.delete(k);
    }
  }
  return { hit, take, refund, snapshot, sweep };
}

/** Client IP. Behind a proxy, take the Nth entry from the right of X-Forwarded-For (default 1 hop). */
export function clientIp(req, hops = 1) {
  const xff = req.headers['x-forwarded-for'];
  if (hops > 0 && typeof xff === 'string' && xff.length) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[Math.max(0, parts.length - hops)];
  }
  return req.socket?.remoteAddress || 'unknown';
}
