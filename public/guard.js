// Family page for Live Guard: create a code, send the link to the parent's second device, watch alerts live.
import { STR } from './i18n.js?v=20261120b';
import { LSTR } from './i18n-live.js?v=20261120b';
import { el, markedText, suspiciousList, verdictBox, fmtClock, translator, beep, vibrate, unlockAudio } from './ui-kit.js?v=20261120b';

const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };
let lang = store.get('rakshak.lang') || ((navigator.language || '').toLowerCase().startsWith('hi') ? 'hi' : 'en');
const t = translator(() => lang, LSTR, STR);
const app = document.getElementById('app');

let code = null, es = null, poll = null, last = null, receivedAt = 0, lastSeq = null, ticker = null, alertsOn = false;

for (const b of document.querySelectorAll('.seg-btn')) b.addEventListener('click', () => { lang = b.dataset.lang; store.set('rakshak.lang', lang); render(); });

const parseCode = () => (location.hash || '').replace('#', '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

function chrome() {
  document.documentElement.lang = lang;
  document.getElementById('brandName').textContent = t('appName');
  document.getElementById('brandSub').textContent = t('appSub');
  for (const b of document.querySelectorAll('.seg-btn')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
}

function card(...kids) { const c = el('section', 'card'); c.append(...kids); return c; }

// ---------- setup ----------
function renderSetup(errMsg) {
  app.textContent = '';
  const consent = el('input'); consent.type = 'checkbox'; consent.id = 'consent';
  const label = el('label', 'check'); label.append(consent, el('span', '', t('guardConsent')));
  const btn = el('button', 'btn primary', t('guardCreate')); btn.type = 'button'; btn.disabled = true;
  consent.addEventListener('change', () => { btn.disabled = !consent.checked; });
  btn.addEventListener('click', async () => {
    unlockAudio(); btn.disabled = true;
    try {
      const r = await fetch('/api/live/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { const c = d?.error?.code; renderSetup(t(c === 'busy' ? 'errBusy' : c === 'rate_limited' ? 'errRate' : c === 'not_configured' ? 'errConfig' : 'errGeneric')); return; }
      location.hash = d.code; code = d.code; renderWatch(); connect();
    } catch { renderSetup(t('errNet')); }
  });
  const kids = [
    el('h2', '', t('guardTitle')), el('p', '', t('guardIntro')), el('p', 'notice', t('guardNeeds')), el('p', 'muted small', t('guardPrivacy')),
    label, btn,
  ];
  if (errMsg) { const b = el('p', 'banner error', errMsg); b.setAttribute('role', 'alert'); kids.push(b); }
  app.append(card(...kids));
}

// ---------- watch ----------
function linkForParent() { return `${location.origin}/listen#${code}`; }

function renderWatch() {
  chrome();
  app.textContent = '';
  const s = last;

  // Pairing card
  const link = linkForParent();
  const pair = el('section', 'card');
  pair.append(el('p', 'res-h', t('guardCode')), el('div', 'code', code), el('p', 'muted small', t('guardOpenParent')), el('p', 'linkbox', link));
  const wa = el('a', 'btn secondary', t('guardShareWa')); wa.href = `https://wa.me/?text=${encodeURIComponent(t('guardWaMsg', { link }))}`; wa.target = '_blank'; wa.rel = 'noopener';
  const cp = el('button', 'btn ghost', t('guardCopy')); cp.type = 'button';
  cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); cp.textContent = t('guardCopied'); } catch { /* ignore */ } });
  const row = el('div', 'actions'); row.append(wa, cp); pair.append(row);
  if (!s || s.status === 'waiting') pair.append(el('p', 'notice', t('guardNeeds')));
  app.append(pair);

  // Status
  const st = el('section', 'card');
  const pill = statusPill(s);
  st.append(pill);
  if (s?.sttError) st.append(el('p', 'banner', t('guardSttErr', { why: whyText(s.sttError) })));
  if (s?.note?.ai) st.append(el('p', 'banner', t('guardAiNote', { why: whyText(s.note.ai) })));
  if (s?.capped) st.append(el('p', 'banner', t('guardLimit', { t: fmtClock(s.listeningSeconds) })));
  if (s?.dailyCap) st.append(el('p', 'banner error', t('guardDailyCap')));
  app.append(st);

  // Alert
  if (s && s.status !== 'ended' && s.alert) app.append(alertCard(s));
  if (s?.status === 'ended') {
    const lv = s.finalLevel && s.finalLevel !== 'none' ? t('v_' + s.finalLevel) : t('v_no_clear_signs');
    app.append(card(el('h2', '', t('guardEnded')), el('p', '', t('guardEndedLevel', { x: lv }))));
  }

  // Heard
  if (s && s.status !== 'ended') {
    const heard = el('section', 'card'); heard.append(el('p', 'res-h', t('guardHeard')));
    if (s.latest.text) heard.append(markedText(s.latest.text, s.latest.highlights)); else heard.append(el('p', 'muted', t('guardNoWords')));
    app.append(heard);
  }

  // Controls
  const ctl = el('section', 'card');
  if (s?.status !== 'ended') {
    if (!alertsOn) {
      const al = el('button', 'btn secondary', t('guardAllow')); al.type = 'button';
      al.addEventListener('click', async () => { unlockAudio(); beep(1); vibrate(120); alertsOn = true; try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* ignore */ } render(); });
      ctl.append(al);
    } else ctl.append(el('p', 'notice', t('guardAllowed')));
    const end = el('button', 'btn ghost', t('guardEnd')); end.type = 'button';
    end.addEventListener('click', async () => { try { await fetch(`/api/live/end?code=${code}`, { method: 'POST' }); } catch { /* ignore */ } });
    ctl.append(end);
  } else {
    const again = el('button', 'btn primary', t('guardCreate')); again.type = 'button';
    again.addEventListener('click', () => { closeStreams(); code = null; last = null; history.replaceState(null, '', location.pathname); renderSetup(); });
    ctl.append(again);
  }
  app.append(ctl);
}

const whyText = (k) => { const v = t('liveWhy_' + k); return v.startsWith('liveWhy_') ? t('liveWhy_other') : v; };

function statusPill(s) {
  const p = el('p', 'pill');
  if (!s || s.status === 'waiting') { p.classList.add('wait'); p.textContent = t('guardWaiting'); return p; }
  if (s.status === 'ended') { p.textContent = t('guardEnded'); return p; }
  const ago = (s.listenerSeenAgoSec ?? 0) + Math.round((Date.now() - receivedAt) / 1000);
  if (ago > 40) { p.classList.add('warn'); p.textContent = t('guardPaused', { s: ago }); return p; }
  p.classList.add('ok'); p.textContent = t('guardListening', { t: fmtClock(s.listeningSeconds) });
  return p;
}

function alertCard(s) {
  const a = s.alert; const c = el('section', 'card alertcard');
  const box = verdictBox(a.verdict, t('v_' + a.verdict), a.verdict === 'likely_scam' || a.verdict === 'warning_signs' ? t('guardCallNow') : '');
  c.append(box, markedText(a.text, a.highlights));
  const strong = a.highlights.filter((h) => h.kind === 'strong');
  if (strong.length) { c.append(el('p', 'res-h', t('capSus')), suspiciousList(a.highlights, 'strong')); }
  c.append(el('p', 'res-h', t('capWhy')), el('p', '', a.explanation));
  const nx = el('div', 'next'); nx.append(el('h3', '', t('capNext')), el('p', 'big', a.nextStep)); if (a.helpLine) nx.append(el('p', 'help', a.helpLine));
  c.append(nx);
  return c;
}

function render() { chrome(); if (!code) renderSetup(); else renderWatch(); }

// ---------- live connection ----------
function onState(s) {
  const first = last === null;
  last = s; receivedAt = Date.now();
  if (lastSeq === null) lastSeq = s.alertSeq; // joining late: show, do not buzz
  else if (s.alertSeq > lastSeq) {
    lastSeq = s.alertSeq;
    if (alertsOn) {
      vibrate(s.alertLevel === 'likely_scam' ? [400, 150, 400, 150, 800] : [250, 120, 250]);
      beep(s.alertLevel === 'likely_scam' ? 4 : 2);
      try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(t('appName'), { body: `${t('v_' + s.alertLevel)}. ${t('guardCallNow')}` }); } catch { /* ignore */ }
    }
  }
  if (first || true) renderWatch();
  if (s.status === 'ended') closeStreams();
}

function closeStreams() { if (es) { es.close(); es = null; } if (poll) { clearInterval(poll); poll = null; } if (ticker) { clearInterval(ticker); ticker = null; } }

function startPolling() {
  if (poll) return;
  poll = setInterval(async () => {
    try { const r = await fetch(`/api/live/state?code=${code}`); if (r.status === 404) { closeStreams(); return noLink(); } if (r.ok) onState(await r.json()); } catch { /* retry next tick */ }
  }, 3000);
}

function noLink() { app.textContent = ''; app.append(card(el('p', 'banner error', t('guardNoLink')), (() => { const b = el('button', 'btn primary', t('guardCreate')); b.type = 'button'; b.addEventListener('click', () => { code = null; history.replaceState(null, '', location.pathname); renderSetup(); }); return b; })())); }

function connect() {
  closeStreams();
  try {
    es = new EventSource(`/api/live/stream?code=${code}`);
    es.onmessage = (e) => { try { onState(JSON.parse(e.data)); } catch { /* ignore */ } };
    es.onerror = async () => {
      // Distinguish "bad code" from a network blip, and fall back to polling if streaming is unavailable.
      try { const r = await fetch(`/api/live/state?code=${code}`); if (r.status === 404) { closeStreams(); noLink(); return; } } catch { /* offline */ }
      if (es && es.readyState === 2) startPolling();
    };
  } catch { startPolling(); }
  ticker = setInterval(() => { if (last && last.status === 'listening') renderWatch(); }, 5000); // refresh "no audio for N s"
}

// ---------- start ----------
chrome();
code = parseCode();
if (code.length === 6) { renderWatch(); connect(); } else renderSetup();
window.addEventListener('hashchange', () => { const c = parseCode(); if (c.length === 6 && c !== code) { code = c; last = null; lastSeq = null; renderWatch(); connect(); } });
