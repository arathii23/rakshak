// Parent-device page for Live Guard. Sits next to the phone while a call is on speaker, sends short
// audio clips to the server, and shows/speaks a warning when the server raises the alert.
import { STR } from './i18n.js';
import { LSTR } from './i18n-live.js';
import { el, icon, ICONS, translator, beep, vibrate, unlockAudio } from './ui-kit.js';
import { startChunkRecorder } from './recorder.js';

const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };
let lang = store.get('rakshak.lang') || ((navigator.language || '').toLowerCase().startsWith('hi') ? 'hi' : 'en');
let langFromSession = false;
const t = translator(() => lang, LSTR, STR);
const app = document.getElementById('app');
const overlay = document.getElementById('overlay');

let code = (location.hash || '').replace('#', '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
// No code in the link = the parent opened Rakshak on their own phone: a session is created when they tap Start.
const solo = code.length !== 6;
let recorder = null, wakeLock = null, queue = Promise.resolve(), pending = 0, lastSeq = 0, view = 'setup', trouble = false, audioEl = null;
let levelEl = null;

for (const b of document.querySelectorAll('.seg-btn')) b.addEventListener('click', () => { lang = b.dataset.lang; store.set('rakshak.lang', lang); langFromSession = true; render(); });

function chrome() {
  document.documentElement.lang = lang;
  document.getElementById('brandName').textContent = t('appName');
  document.getElementById('brandSub').textContent = t('appSub');
  for (const b of document.querySelectorAll('.seg-btn')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
}

function render() {
  chrome(); app.textContent = '';
  if (view === 'badlink') return app.append(card(el('p', 'banner error', t('listenBadLink'))));
  if (view === 'ended') return app.append(card(el('h2', '', t('listenEnded')), el('p', 'muted', msg)));
  if (view === 'on') return renderOn();
  renderSetup();
}
let msg = '';
const card = (...k) => { const c = el('section', 'card'); c.append(...k); return c; };

function renderSetup() {
  const ul = el('ul', 'plain'); for (const k of (solo ? ['soloStep1', 'soloStep2', 'soloStep3'] : ['listenStep1', 'listenStep2', 'listenStep3'])) ul.append(el('li', '', t(k)));
  const consent = el('input'); consent.type = 'checkbox';
  const lab = el('label', 'check'); lab.append(consent, el('span', '', t(solo ? 'soloConsent' : 'listenConsent')));
  const btn = el('button', 'btn primary big', t('listenStart')); btn.type = 'button'; btn.disabled = true;
  consent.addEventListener('change', () => { btn.disabled = !consent.checked; });
  btn.addEventListener('click', start);
  const kids = [el('h2', '', t(solo ? 'soloTitle' : 'listenTitle')), el('p', '', t(solo ? 'soloIntro' : 'listenIntro')), ul, el('p', 'muted small', t(solo ? 'soloData' : 'listenData')), lab, btn];
  if (msg) { const b = el('p', 'banner error', msg); b.setAttribute('role', 'alert'); kids.push(b); }
  app.append(card(...kids));
}

function renderOn() {
  const meter = el('div', 'meter'); levelEl = el('div'); meter.append(levelEl);
  const stop = el('button', 'btn danger big', t('listenStop')); stop.type = 'button'; stop.addEventListener('click', () => stopAll(true));
  const kids = [
    el('h2', 'listening', t('listenOn')), meter, el('p', 'muted small', t('listenLevel')),
  ];
  if (!solo) kids.push(el('p', 'notice', t('listenWatching', { c: code })));
  else {
    const link = `${location.origin}/guard#${code}`;
    const wa = el('a', 'btn secondary', t('soloShareWa')); wa.href = `https://wa.me/?text=${encodeURIComponent(t('soloWaMsg', { link }))}`; wa.target = '_blank'; wa.rel = 'noopener';
    kids.push(el('p', 'notice', t('soloShareBody')), wa);
  }
  if (trouble) kids.push(el('p', 'banner', t('listenTrouble')));
  kids.push(stop);
  app.append(card(...kids));
}

// ---------- start / stop ----------
async function start() {
  msg = '';
  if (!navigator.mediaDevices?.getUserMedia) { msg = t('listenNoMic'); return render(); }
  unlockAudio();
  if (solo && code.length !== 6) {
    try {
      const r = await fetch('/api/live/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { const c = d?.error?.code; msg = t(c === 'busy' ? 'errBusy' : c === 'rate_limited' ? 'errRate' : c === 'not_configured' ? 'errConfig' : 'errGeneric'); return render(); }
      code = d.code;
    } catch { msg = t('errNet'); return render(); }
  }
  try {
    recorder = await startChunkRecorder({ chunkSeconds: 8, onChunk: upload, onLevel: (l) => { if (levelEl) levelEl.style.width = `${Math.max(3, Math.round(l * 100))}%`; } });
  } catch (e) {
    msg = t(e?.name === 'NotAllowedError' ? 'listenDenied' : 'listenNoMic');
    if (solo) { fetch('/api/live/end', { method: 'POST', headers: { 'x-session-code': code } }).catch(() => {}); code = ''; } // do not leave an unused session open
    return render();
  }
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
  view = 'on'; trouble = false; render();
}

async function stopAll(wipe) {
  if (recorder) { try { recorder.stop(); } catch { /* ignore */ } recorder = null; }
  try { await wakeLock?.release(); } catch { /* ignore */ } wakeLock = null;
  if (wipe) { try { await fetch('/api/live/end', { method: 'POST', headers: { 'x-session-code': code } }); } catch { /* ignore */ } }
  overlay.classList.add('hidden'); overlay.textContent = '';
  view = 'ended'; msg = ''; render();
}

document.addEventListener('visibilitychange', async () => {
  if (view === 'on' && document.visibilityState === 'visible' && !wakeLock) { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* ignore */ } }
});

// ---------- upload (one at a time; drop clips if the network is far behind) ----------
function upload(blob) {
  if (pending >= 3) return;
  pending++;
  queue = queue.then(() => send(blob)).finally(() => { pending--; });
}
async function send(blob) {
  try {
    const r = await fetch('/api/live/chunk', { method: 'POST', headers: { 'content-type': 'audio/wav', 'x-session-code': code }, body: blob });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setTrouble(false); onAlert(d); return; }
    const c = d?.error?.code;
    if (c === 'session_cap') { msg = t('listenLimit'); return stopAll(false); }
    if (c === 'daily_cap') { msg = t('listenDaily'); return stopAll(false); }
    if (c === 'session_ended' || c === 'no_such_session') { msg = t('listenFamilyStopped'); return stopAll(false); }
    setTrouble(true);
  } catch { setTrouble(true); }
}
function setTrouble(v) { if (trouble !== v) { trouble = v; if (view === 'on') render(); } }

// ---------- alerts on this device ----------
function onAlert(d) {
  if (typeof d?.alertSeq !== 'number' || d.alertSeq <= lastSeq) return;
  lastSeq = d.alertSeq;
  const scam = d.alertLevel === 'likely_scam';
  vibrate(scam ? [500, 200, 500, 200, 900] : [300, 150, 300]);
  beep(scam ? 4 : 2);
  overlay.textContent = '';
  const box = el('div', `ovbox ${scam ? 'scam' : 'warn'}`);
  const ic = icon(ICONS.likely_scam); box.append(ic, el('h2', '', t(scam ? 'listenScamTitle' : 'listenWarnTitle')), el('p', 'big', t(scam ? 'listenScamBody' : 'listenWarnBody')));
  const ok = el('button', 'btn ghost', 'OK'); ok.type = 'button'; ok.addEventListener('click', () => { overlay.classList.add('hidden'); if (audioEl) { audioEl.pause(); audioEl = null; } });
  box.append(ok); overlay.append(box); overlay.classList.remove('hidden');
  if (scam) speak(t('spokenScam'));
}
async function speak(text) {
  try {
    const r = await fetch('/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang }) });
    if (!r.ok) return; // the on-screen warning, beeps and vibration are already shown
    const url = URL.createObjectURL(await r.blob());
    audioEl = new Audio(url); audioEl.addEventListener('ended', () => URL.revokeObjectURL(url)); await audioEl.play();
  } catch { /* the screen warning is enough */ }
}

// ---------- boot ----------
(async function init() {
  chrome();
  if (solo) return render();
  try {
    const r = await fetch(`/api/live/state?code=${code}`);
    if (!r.ok) { view = 'badlink'; return render(); }
    const s = await r.json();
    if (s.status === 'ended') { view = 'badlink'; return render(); }
    if (!langFromSession && !store.get('rakshak.lang')) lang = s.lang; // follow the family's choice on first visit
  } catch { view = 'badlink'; }
  render();
})();
window.addEventListener('pagehide', () => { /* the server wipes idle sessions after 15 minutes */ });
