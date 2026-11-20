import { STR, EXAMPLES } from './i18n.js';
import { toWav16k } from './wav-encode.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage may be blocked */ } },
};
const HIST_KEY = 'rakshak.history.v1';
const MAX_HIST = 10;

let lang = store.get('rakshak.lang') || ((navigator.language || '').toLowerCase().startsWith('hi') ? 'hi' : 'en');
let status = { ai: true, maxAudioSeconds: 20, maxTextChars: 1000 };
let current = null;      // { text, result, example }
let audio = null;        // playing Audio element

const t = (k, vars = {}) => {
  let s = (STR[lang] && STR[lang][k]) ?? STR.en[k] ?? k;
  for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s;
};

// Render a string that may contain <strong>…</strong> (our own static text only) without innerHTML.
function setRich(el, s) {
  el.textContent = '';
  const parts = s.split(/(<strong>.*?<\/strong>)/);
  for (const p of parts) {
    const m = p.match(/^<strong>(.*)<\/strong>$/);
    if (m) { const b = document.createElement('strong'); b.textContent = m[1]; el.append(b); } else el.append(p);
  }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---------- language ----------
function applyLang() {
  document.documentElement.lang = lang;
  for (const n of document.querySelectorAll('[data-i18n]')) {
    const k = n.dataset.i18n;
    if (k === 'recDevice') setRich(n, t(k));
    else n.textContent = t(k, { s: status.maxAudioSeconds });
  }
  for (const n of document.querySelectorAll('[data-i18n-ph]')) n.placeholder = t(n.dataset.i18nPh);
  for (const b of document.querySelectorAll('.seg-btn')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  $('recLimit').textContent = t('recLimit', { s: status.maxAudioSeconds });
  renderExamples();
  renderHistory();
}

for (const b of document.querySelectorAll('.seg-btn')) {
  b.addEventListener('click', () => {
    lang = b.dataset.lang; store.set('rakshak.lang', lang); stopAudio(); current = null; $('out').textContent = ''; applyLang();
  });
}

// ---------- input ----------
const ta = $('text');
const updateCount = () => { $('count').textContent = `${ta.value.length} / ${status.maxTextChars}`; };
ta.addEventListener('input', () => { updateCount(); $('reviewNote').classList.add('hidden'); });
$('clear').addEventListener('click', () => { ta.value = ''; updateCount(); ta.focus(); $('reviewNote').classList.add('hidden'); });

function renderExamples() {
  const box = $('examples');
  box.textContent = '';
  for (const ex of EXAMPLES) {
    const b = el('button', 'chip', ex[lang]);
    b.type = 'button';
    b.addEventListener('click', () => { ta.value = ex.text; updateCount(); $('reviewNote').classList.add('hidden'); runCheck(ex.text, true); });
    box.append(b);
  }
}

// ---------- check ----------
const WHY_KEYS = ['timeout', 'network', 'server', 'quota', 'rate_limited', 'daily_cap', 'busy', 'not_configured', 'bad_response', 'auth', 'bad_request'];

function showLoading() {
  const out = $('out'); out.setAttribute('aria-busy', 'true'); out.textContent = '';
  const s = el('div', 'skeleton'); s.setAttribute('role', 'status'); s.setAttribute('aria-label', t('checking'));
  out.append(s);
}
function showError(msg) {
  const out = $('out'); out.setAttribute('aria-busy', 'false'); out.textContent = '';
  const b = el('div', 'banner error', msg); b.setAttribute('role', 'alert'); out.append(b);
}

async function runCheck(text, example = false) {
  stopAudio();
  text = (text ?? ta.value).trim();
  if (!text) { showError(t('errEmpty')); ta.focus(); return; }
  const btn = $('check');
  btn.disabled = true; btn.firstElementChild.textContent = t('checking');
  showLoading();
  $('out').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  try {
    const res = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = data?.error?.code;
      showError(code === 'text_too_long' ? t('errTooLong', { n: data.error.max }) : code === 'empty_text' ? t('errEmpty') : t('errGeneric'));
      return;
    }
    current = { text, result: data, example };
    renderResult(data, text, example);
    saveHistory({ text, result: data, lang, example });
  } catch {
    showError(t('errNetwork'));
  } finally {
    btn.disabled = false; btn.firstElementChild.textContent = t('check');
  }
}
$('check').addEventListener('click', () => runCheck());

// ---------- result ----------
const ICONS = {
  likely_scam: 'M12 3 3 19h18L12 3zM12 10v4M12 17v.01',
  warning_signs: 'M12 3 3 19h18L12 3zM12 10v4M12 17v.01',
  no_clear_signs: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.01',
  not_enough_info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.01',
};
function icon(path) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', path); s.append(p);
  return s;
}

function renderResult(r, text, example) {
  const out = $('out');
  out.setAttribute('aria-busy', 'false');
  out.textContent = '';

  if (r.limited) {
    const why = WHY_KEYS.includes(r.limitedReason) ? t('why_' + r.limitedReason) : t('why_other');
    const b = el('div', 'banner');
    b.append(el('strong', '', t('limitedTitle') + ': '), document.createTextNode(t('limitedBody', { why })));
    b.setAttribute('role', 'status');
    out.append(b);
  }

  const v = el('div', `verdict v-${r.verdict}`);
  const head = el('div', 'head');
  head.append(icon(ICONS[r.verdict] || ICONS.not_enough_info), el('h2', '', t('v_' + r.verdict)));
  v.append(head);
  if (example) v.append(el('span', 'tag', t('exTag')));
  v.append(el('p', '', t('unsure')));
  out.append(v);

  // What was said, with exact highlights (every highlight is a substring of the submitted text)
  const said = el('div', 'said');
  let pos = 0;
  for (const h of [...r.highlights].sort((a, b) => a.start - b.start)) {
    if (h.start < pos || h.end > text.length || text.slice(h.start, h.end) !== h.text) continue; // never show a quote that is not in the text
    if (h.start > pos) said.append(text.slice(pos, h.start));
    const m = el('mark', h.kind, h.text); said.append(m); pos = h.end;
  }
  said.append(text.slice(pos));
  const c1 = el('div', 'card'); c1.append(el('p', 'res-h', t('capWords')), said); out.append(c1);

  const strong = r.highlights.filter((h) => h.kind === 'strong');
  const notes = r.highlights.filter((h) => h.kind === 'note');
  const c2 = el('div', 'card'); c2.append(el('p', 'res-h', t('capSus')));
  if (strong.length) {
    const ul = el('ul', 'sus');
    for (const h of strong) { const li = el('li'); const q = el('q', '', h.text); li.append(q); if (h.label) li.append(el('span', 'why', h.label)); ul.append(li); }
    c2.append(ul);
  } else c2.append(el('p', 'muted', t('noSus')));
  if (notes.length) {
    c2.append(el('p', 'res-h', t('capAlso')));
    const ul = el('ul', 'sus');
    for (const h of notes) { const li = el('li', 'note'); li.append(el('q', '', h.text)); if (h.label) li.append(el('span', 'why', h.label)); ul.append(li); }
    c2.append(ul);
  }
  out.append(c2);

  const c3 = el('div', 'card'); c3.append(el('p', 'res-h', t('capWhy')), el('p', '', r.explanation)); out.append(c3);

  const nx = el('div', 'next');
  nx.append(el('h3', '', t('capNext')), el('p', 'big', r.nextStep));
  if (r.helpLine) nx.append(el('p', 'help', r.helpLine));
  const read = el('button', 'btn secondary'); read.type = 'button'; read.id = 'read';
  read.append(icon('M4 9v6h4l5 4V5L8 9H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12'), el('span', '', t('readAloud')));
  read.addEventListener('click', () => toggleRead(r));
  nx.append(read);
  out.append(nx);

  out.append(el('p', 'src', r.limited ? t('srcRules') : t('srcAi')));
}

// ---------- read aloud ----------
function stopAudio() {
  if (audio) { audio.pause(); audio = null; }
  const b = $('read'); if (b) { b.disabled = false; b.lastElementChild.textContent = t('readAloud'); }
}
async function toggleRead(r) {
  const b = $('read'); const label = b.lastElementChild;
  if (audio) { stopAudio(); return; }
  let text = `${r.explanation} ${r.nextStep}`.trim();
  const max = 450;
  if (text.length > max) text = text.slice(0, max).replace(/[^.।!?]*$/, '') || text.slice(0, max);
  b.disabled = true; label.textContent = t('readLoading');
  try {
    const res = await fetch('/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang }) });
    if (!res.ok) {
      const code = (await res.json().catch(() => ({})))?.error?.code;
      throw new Error(code === 'daily_cap' ? 'sp_daily_cap' : code === 'rate_limited' ? 'sp_rate_limited' : 'sp_error');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = new Audio(url); audio = a;
    a.addEventListener('ended', () => { URL.revokeObjectURL(url); stopAudio(); });
    a.addEventListener('error', () => { stopAudio(); noteSpeakError('sp_error'); });
    await a.play();
    b.disabled = false; label.textContent = t('readStop');
  } catch (e) {
    audio = null; b.disabled = false; label.textContent = t('readAloud');
    noteSpeakError(STR.en[e.message] ? e.message : 'sp_error');
  }
}
function noteSpeakError(key) {
  const old = document.querySelector('.speak-err'); if (old) old.remove();
  const n = el('p', 'banner error speak-err', t(key)); n.setAttribute('role', 'alert');
  $('read').after(n);
}

// ---------- history (device only) ----------
function loadHistory() { try { return JSON.parse(store.get(HIST_KEY) || '[]'); } catch { return []; } }
function saveHistory(entry) {
  const list = loadHistory();
  list.unshift({ id: String(Date.now()), ts: Date.now(), text: entry.text.slice(0, 1000), lang: entry.lang, example: !!entry.example, result: entry.result });
  store.set(HIST_KEY, JSON.stringify(list.slice(0, MAX_HIST)));
  renderHistory();
}
function renderHistory() {
  const list = loadHistory();
  const ul = $('hist'); ul.textContent = '';
  $('histEmpty').classList.toggle('hidden', list.length > 0);
  $('histClear').classList.toggle('hidden', list.length === 0);
  for (const h of list) {
    const li = el('li');
    const meta = el('div', 'meta');
    meta.append(el('span', `tag v-${h.result.verdict}`, t('v_' + h.result.verdict)), el('span', '', new Date(h.ts).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })));
    li.append(meta, el('div', 'snip', h.text.length > 90 ? h.text.slice(0, 90) + '…' : h.text));
    const btns = el('div', 'btns');
    const view = el('button', '', t('histView')); view.type = 'button';
    view.addEventListener('click', () => {
      stopAudio(); ta.value = h.text; updateCount();
      current = { text: h.text, result: h.result, example: h.example }; renderResult(h.result, h.text, h.example);
      $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const del = el('button', '', t('histDelete')); del.type = 'button';
    del.addEventListener('click', () => { store.set(HIST_KEY, JSON.stringify(loadHistory().filter((x) => x.id !== h.id))); renderHistory(); });
    btns.append(view, del); li.append(btns); ul.append(li);
  }
}
$('histClear').addEventListener('click', () => { store.set(HIST_KEY, '[]'); renderHistory(); });

// ---------- voice recording (16 kHz mono WAV, made in the browser) ----------
const dlg = $('rec');
const sheet = dlg.querySelector('.sheet');
let rec = null;

const setStep = (s) => { sheet.dataset.step = s; };
function closeRec() { stopRecorder(true); if (dlg.open) dlg.close(); }

$('speak').addEventListener('click', () => {
  if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) { showError(t('tr_mic_missing')); return; }
  setStep('intro');
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
});
$('recCancel1').addEventListener('click', closeRec);
$('recCancel2').addEventListener('click', closeRec);
dlg.addEventListener('cancel', () => stopRecorder(true));
$('recStop').addEventListener('click', () => finishRecording());
$('recStart').addEventListener('click', startRecording);

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
  } catch (e) {
    closeRec(); showError(t(e?.name === 'NotAllowedError' ? 'tr_mic_denied' : 'tr_mic_missing')); return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  rec = { stream, ctx, src, proc, chunks, started: performance.now(), timer: null, done: false };
  proc.onaudioprocess = (e) => {
    const data = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(data);
    let sum = 0; for (let i = 0; i < data.length; i += 8) sum += data[i] * data[i];
    const level = Math.min(1, Math.sqrt(sum / (data.length / 8)) * 6);
    $('recLevel').style.width = `${Math.max(3, Math.round(level * 100))}%`;
  };
  src.connect(proc); proc.connect(ctx.destination);
  setStep('rec');
  const max = status.maxAudioSeconds;
  rec.timer = setInterval(() => {
    const s = (performance.now() - rec.started) / 1000;
    $('recTimer').textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    if (s >= max) finishRecording();
  }, 200);
}

function stopRecorder(discard) {
  if (!rec) return null;
  const r = rec; rec = null;
  clearInterval(r.timer);
  try { r.proc.disconnect(); r.src.disconnect(); } catch { /* ignore */ }
  r.stream.getTracks().forEach((tr) => tr.stop());
  const rate = r.ctx.sampleRate;
  r.ctx.close().catch(() => {});
  return discard ? null : { chunks: r.chunks, rate };
}

async function finishRecording() {
  const got = stopRecorder(false);
  if (!got) return;
  setStep('work');
  try {
    const wav = toWav16k(got.chunks, got.rate);
    const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = data?.error?.code || 'service_error';
      closeRec(); showError(t('tr_' + (STR.en['tr_' + code] ? code : 'service_error'), { s: status.maxAudioSeconds })); return;
    }
    closeRec();
    ta.value = data.transcript; updateCount();
    $('reviewNote').classList.remove('hidden');
    $('out').textContent = '';
    ta.focus();
  } catch {
    closeRec(); showError(t('errNetwork'));
  }
}

// ---------- start ----------
(async function init() {
  try { const r = await fetch('/api/status'); if (r.ok) status = { ...status, ...(await r.json()) }; } catch { /* keep defaults */ }
  ta.maxLength = status.maxTextChars;
  applyLang(); updateCount();
  if (!status.ai) $('speak').disabled = true;
})();
