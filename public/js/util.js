/* FoodieGo - utilities, API client, toasts */
'use strict';
const FG = window.FG = { user: null, view: null, timers: [] };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const ratingClass = (r) => r >= 4 ? '' : r >= 3.5 ? 'mid' : 'low';
const gradient = (r) => `linear-gradient(135deg,hsl(${r.hue[0]} 85% 58%),hsl(${r.hue[1]} 90% 62%))`;
const fmtDate = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const vegMark = (v) => `<span class="vegmark ${v ? '' : 'nv'}" title="${v ? 'Vegetarian' : 'Non-vegetarian'}"></span>`;
const CUISINE_EMOJI = { Biryani: '🍛', Mughlai: '🍖', 'North Indian': '🍲', Thali: '🍱', Pizza: '🍕', Italian: '🍝', Burgers: '🍔', 'Fast Food': '🍟', Chinese: '🥡', Asian: '🥢', 'South Indian': '🫓', 'Street Food': '🥟', Snacks: '🥨', Desserts: '🍰', Sweets: '🍬', Kebabs: '🍢', Healthy: '🥗', Salads: '🥬', Tandoor: '🍗', Beverages: '🧋', Cafe: '☕' };

function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type;
  t.innerHTML = (type === 'ok' ? '✅ ' : type === 'err' ? '⚠️ ' : '🔔 ') + esc(msg);
  $('#toasts').appendChild(t); setTimeout(() => { t.style.opacity = 0; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = localStorage.getItem('fg_token'); if (tok) headers.Authorization = 'Bearer ' + tok;
  let res;
  try { res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch (e) { throw new Error('Cannot reach the server. Is it running?'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || 'Something went wrong'); err.status = res.status; throw err; }
  return data;
}

function confetti() {
  const box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:300;overflow:hidden';
  const em = ['🎉', '🍕', '🍔', '🍟', '🎊', '🥳', '🍩', '🌮'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span'); s.textContent = em[i % em.length];
    s.style.cssText = `position:absolute;top:-40px;left:${Math.random() * 100}%;font-size:${18 + Math.random() * 22}px;animation:fall ${2.2 + Math.random() * 2}s ${Math.random() * .8}s linear forwards`;
    box.appendChild(s);
  }
  if (!$('#confStyle')) { const st = document.createElement('style'); st.id = 'confStyle'; st.textContent = '@keyframes fall{to{transform:translateY(110vh) rotate(540deg);opacity:.8}}'; document.head.appendChild(st); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 5200);
}
