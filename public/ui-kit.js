// Small DOM helpers shared by the pages. Everything is built with textContent (never innerHTML),
// so transcript text and AI text can never inject markup.

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export const ICONS = {
  likely_scam: 'M12 3 3 19h18L12 3zM12 10v4M12 17v.01',
  warning_signs: 'M12 3 3 19h18L12 3zM12 10v4M12 17v.01',
  no_clear_signs: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.01',
  not_enough_info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.01',
  speaker: 'M4 9v6h4l5 4V5L8 9H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12',
  mic: 'M9 3h6v12H9zM5 11a7 7 0 0 0 14 0M12 18v3',
};

export function icon(path) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', path); s.append(p);
  return s;
}

/** Text with highlights. A highlight is only drawn if it is exactly the same text at that position. */
export function markedText(text, highlights) {
  const box = el('div', 'said');
  let pos = 0;
  for (const h of [...highlights].sort((a, b) => a.start - b.start)) {
    if (h.start < pos || h.end > text.length || text.slice(h.start, h.end) !== h.text) continue;
    if (h.start > pos) box.append(text.slice(pos, h.start));
    box.append(el('mark', h.kind, h.text)); pos = h.end;
  }
  box.append(text.slice(pos));
  return box;
}

export function suspiciousList(highlights, kind) {
  const ul = el('ul', 'sus');
  for (const h of highlights.filter((x) => x.kind === kind)) {
    const li = el('li', kind === 'note' ? 'note' : '');
    li.append(el('q', '', h.text));
    if (h.label) li.append(el('span', 'why', h.label));
    ul.append(li);
  }
  return ul;
}

export function verdictBox(verdict, title, subtitle, tag) {
  const v = el('div', `verdict v-${verdict}`);
  const head = el('div', 'head');
  head.append(icon(ICONS[verdict] || ICONS.not_enough_info), el('h2', '', title));
  v.append(head);
  if (tag) v.append(el('span', 'tag', tag));
  if (subtitle) v.append(el('p', '', subtitle));
  return v;
}

export const fmtClock = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

/** Make a translator for a language over several dictionaries. */
export function translator(getLang, ...dicts) {
  return (k, vars = {}) => {
    const l = getLang();
    let s = dicts.map((d) => d[l]?.[k]).find((x) => x !== undefined) ?? dicts.map((d) => d.en?.[k]).find((x) => x !== undefined) ?? k;
    for (const [a, b] of Object.entries(vars)) s = String(s).replaceAll(`{${a}}`, b);
    return s;
  };
}

/** A short alarm: three beeps. Needs a prior user gesture (browsers block audio otherwise). */
let audioCtx = null;
export function unlockAudio() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch { /* ignore */ }
}
export function beep(times = 3) {
  try {
    unlockAudio(); if (!audioCtx) return;
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      const t0 = audioCtx.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.start(t0); o.stop(t0 + 0.3);
    }
  } catch { /* ignore */ }
}
export const vibrate = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* ignore */ } };
