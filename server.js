'use strict';
/*
 * FoodieGo - Food Delivery Services : backend
 * Zero-dependency Node.js server (http + fs + crypto). JSON file used as the database.
 * Run:  node server.js     ->  http://localhost:3000
 */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { price } = require('./lib/pricing');
const seed = require('./data/seed');

const PORT = process.env.PORT || 3000;
const TIME_SCALE = parseFloat(process.env.TIME_SCALE || '1');   // 1 = 3-minute demo delivery; use 10 for a 30-minute realistic flow
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const KEY_FILE = path.join(DATA_DIR, 'secret.key');
const PUBLIC = path.join(__dirname, 'public');

// ---------- database (in-memory + JSON file persistence) ----------
if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify(seed.build(), null, 2)); console.log('Seeded fresh database.'); }
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), () => { }), 200); }
if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'));
const SECRET = fs.readFileSync(KEY_FILE, 'utf8');
const uid = (p) => p + crypto.randomBytes(4).toString('hex');

// ---------- auth helpers ----------
const b64 = (s) => Buffer.from(s).toString('base64url');
function makeToken(userId) { const body = b64(JSON.stringify({ u: userId, e: Date.now() + 7 * 864e5 })); return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url'); }
function readToken(tok) {
  if (!tok) return null; const [body, sig] = tok.split('.'); if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.e > Date.now() ? p.u : null; } catch (e) { return null; }
}
const safeUser = (u) => u && ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, addresses: u.addresses, favorites: u.favorites, points: u.points });
const clean = (s, n = 200) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);

// ---------- order lifecycle (time based simulation) ----------
const STAGES = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
const STAGE_AT = [0, 15, 50, 110, 190];       // seconds after placing (demo speed)
function live(o) {
  if (o.manualStatus) {
    if (o.manualStatus === 'Cancelled') return { status: 'Cancelled', stage: -1, progress: 0, etaSeconds: 0 };
    const i = STAGES.indexOf(o.manualStatus);
    return { status: o.manualStatus, stage: i, progress: i === 3 ? 0.5 : i === 4 ? 1 : 0, etaSeconds: i === 4 ? 0 : (4 - i) * 300 };
  }
  const el = (Date.now() - o.createdAt) / 1000 / TIME_SCALE * 1; // elapsed in demo seconds
  let i = 0; STAGE_AT.forEach((t, k) => { if (el >= t) i = k; });
  const total = STAGE_AT[4], progress = i === 3 ? (el - STAGE_AT[3]) / (STAGE_AT[4] - STAGE_AT[3]) : i === 4 ? 1 : 0;
  return { status: STAGES[i], stage: i, progress: Math.min(1, Math.max(0, progress)), etaSeconds: Math.max(0, Math.round((total - el) * TIME_SCALE)) };
}
function timeline(o) {
  const l = live(o), out = [];
  if (o.manualStatus) { (o.history || []).forEach(h => out.push({ status: h.status, at: h.at })); return out; }
  for (let i = 0; i <= l.stage; i++) out.push({ status: STAGES[i], at: o.createdAt + STAGE_AT[i] * 1000 * TIME_SCALE });
  return out;
}
const view = (o) => ({ ...o, live: live(o), timeline: timeline(o) });

// ---------- quote / order ----------
function buildQuote(body, user) {
  const rest = db.restaurants.find(r => r.id === body.restaurantId);
  if (!rest) return { error: 'Restaurant not found' };
  const lines = [];
  for (const it of (Array.isArray(body.items) ? body.items : [])) {
    const m = db.menu.find(x => x.id === it.menuId && x.restaurantId === rest.id);
    const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 0));
    if (!m || !m.available || !qty) continue;
    lines.push({ menuId: m.id, name: m.name, price: m.price, qty, veg: m.veg, emoji: m.emoji });
  }
  if (!lines.length) return { error: 'Your cart has no available items' };
  const coupon = body.coupon ? db.coupons.find(c => c.code === String(body.coupon).toUpperCase() && c.active) : null;
  const couponUnknown = !!body.coupon && !coupon;
  const p = price({ lines, coupon, tip: body.tip, pointsAvailable: user ? user.points : 0, usePoints: !!body.usePoints && !!user });
  if (couponUnknown) p.couponError = 'Invalid or expired coupon code';
  return { rest, lines, coupon: p.couponError ? null : coupon, pricing: p };
}

// ---------- tiny HTTP helpers ----------
function send(res, code, obj) { const s = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(s); }
const fail = (res, code, msg) => send(res, code, { error: msg });
function body(req) {
  return new Promise((resolve, reject) => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) { reject(new Error('Payload too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(new Error('Invalid JSON')); } });
  });
}
const rid = (r) => ({ ...r, menuCount: db.menu.filter(m => m.restaurantId === r.id && m.available).length });

// ---------- routes ----------
const routes = [];
const route = (method, pattern, auth, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), auth, fn });

// Auth
route('POST', '/api/auth/register', null, async (q, res) => {
  const b = q.body, email = clean(b.email, 80).toLowerCase(), name = clean(b.name, 60);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return fail(res, 400, 'Enter a valid name and email');
  if (String(b.password || '').length < 6) return fail(res, 400, 'Password must be at least 6 characters');
  if (db.users.find(u => u.email === email)) return fail(res, 409, 'An account with this email already exists');
  const p = seed.hashPassword(String(b.password));
  const u = { id: uid('u'), name, email, phone: clean(b.phone, 15), role: 'customer', salt: p.salt, hash: p.hash, addresses: [], favorites: [], points: 50, createdAt: Date.now() };
  db.users.push(u); save();
  send(res, 201, { token: makeToken(u.id), user: safeUser(u) });
});
route('POST', '/api/auth/login', null, async (q, res) => {
  const email = clean(q.body.email, 80).toLowerCase(), u = db.users.find(x => x.email === email);
  if (!u) return fail(res, 401, 'Invalid email or password');
  const h = crypto.scryptSync(String(q.body.password || ''), u.salt, 32);
  if (!crypto.timingSafeEqual(h, Buffer.from(u.hash, 'hex'))) return fail(res, 401, 'Invalid email or password');
  send(res, 200, { token: makeToken(u.id), user: safeUser(u) });
});
route('GET', '/api/auth/me', 'user', async (q, res) => send(res, 200, { user: safeUser(q.user) }));
route('PUT', '/api/auth/profile', 'user', async (q, res) => {
  const n = clean(q.body.name, 60); if (n) q.user.name = n; q.user.phone = clean(q.body.phone, 15); save(); send(res, 200, { user: safeUser(q.user) });
});
route('POST', '/api/auth/addresses', 'user', async (q, res) => {
  const a = { id: uid('a'), label: clean(q.body.label, 20) || 'Home', line: clean(q.body.line, 120), city: clean(q.body.city, 40), pin: clean(q.body.pin, 6) };
  if (!a.line || !a.city || !/^\d{6}$/.test(a.pin)) return fail(res, 400, 'Enter address line, city and a 6-digit PIN');
  q.user.addresses.push(a); save(); send(res, 201, { user: safeUser(q.user) });
});
route('DELETE', '/api/auth/addresses/:id', 'user', async (q, res) => { q.user.addresses = q.user.addresses.filter(a => a.id !== q.params.id); save(); send(res, 200, { user: safeUser(q.user) }); });

// Catalogue
route('GET', '/api/restaurants', null, async (q, res) => {
  let list = db.restaurants.map(rid); const s = q.query;
  if (s.q) { const t = s.q.toLowerCase(); list = list.filter(r => r.name.toLowerCase().includes(t) || r.cuisines.some(c => c.toLowerCase().includes(t)) || db.menu.some(m => m.restaurantId === r.id && m.name.toLowerCase().includes(t))); }
  if (s.cuisine) list = list.filter(r => r.cuisines.includes(s.cuisine));
  if (s.veg === '1') list = list.filter(r => r.pureVeg);
  if (s.rating) list = list.filter(r => r.rating >= parseFloat(s.rating));
  if (s.fast === '1') list = list.filter(r => r.deliveryMins <= 28);
  if (s.offers === '1') list = list.filter(r => r.offer);
  const sorts = { rating: (a, b) => b.rating - a.rating, time: (a, b) => a.deliveryMins - b.deliveryMins, costLow: (a, b) => a.costForTwo - b.costForTwo, costHigh: (a, b) => b.costForTwo - a.costForTwo };
  if (sorts[s.sort]) list.sort(sorts[s.sort]);
  send(res, 200, { restaurants: list });
});
route('GET', '/api/restaurants/:id', null, async (q, res) => {
  const r = db.restaurants.find(x => x.id === q.params.id); if (!r) return fail(res, 404, 'Restaurant not found');
  send(res, 200, { restaurant: rid(r), menu: db.menu.filter(m => m.restaurantId === r.id), reviews: db.reviews.filter(v => v.restaurantId === r.id).sort((a, b) => b.createdAt - a.createdAt) });
});
route('POST', '/api/restaurants/:id/reviews', 'user', async (q, res) => {
  const r = db.restaurants.find(x => x.id === q.params.id); if (!r) return fail(res, 404, 'Restaurant not found');
  const rating = Math.round(Number(q.body.rating)); if (!(rating >= 1 && rating <= 5)) return fail(res, 400, 'Rating must be 1 to 5');
  const v = { id: uid('v'), restaurantId: r.id, userId: q.user.id, userName: q.user.name, rating, text: clean(q.body.text, 300), createdAt: Date.now() };
  db.reviews.push(v); r.rating = Math.round((r.rating * r.ratingCount + rating) / (r.ratingCount + 1) * 10) / 10; r.ratingCount++; save(); send(res, 201, { review: v });
});
route('GET', '/api/popular', null, async (q, res) => {
  const items = db.menu.filter(m => m.popular && m.available).map(m => { const r = db.restaurants.find(x => x.id === m.restaurantId); return { ...m, restaurantName: r.name, restaurantOpen: r.open }; });
  send(res, 200, { items: items.slice(0, 40) });
});
route('GET', '/api/search', null, async (q, res) => {
  const t = (q.query.q || '').toLowerCase().trim(); if (!t) return send(res, 200, { restaurants: [], dishes: [] });
  const dishes = db.menu.filter(m => m.available && (m.name.toLowerCase().includes(t) || m.category.toLowerCase().includes(t))).slice(0, 24).map(m => { const r = db.restaurants.find(x => x.id === m.restaurantId); return { ...m, restaurantName: r.name, restaurantOpen: r.open }; });
  const restaurants = db.restaurants.filter(r => r.name.toLowerCase().includes(t) || r.cuisines.some(c => c.toLowerCase().includes(t))).map(rid);
  send(res, 200, { restaurants, dishes });
});
route('GET', '/api/coupons', null, async (q, res) => send(res, 200, { coupons: db.coupons.filter(c => c.active) }));
route('POST', '/api/favorites/:id', 'user', async (q, res) => {
  const f = q.user.favorites, i = f.indexOf(q.params.id); if (i >= 0) f.splice(i, 1); else f.push(q.params.id); save(); send(res, 200, { favorites: f });
});

// Cart pricing & orders
route('POST', '/api/quote', null, async (q, res) => {
  const r = buildQuote(q.body, q.user); if (r.error) return fail(res, 400, r.error); send(res, 200, { pricing: r.pricing });
});
route('POST', '/api/orders', 'user', async (q, res) => {
  const b = q.body, r = buildQuote(b, q.user); if (r.error) return fail(res, 400, r.error);
  if (!r.rest.open) return fail(res, 400, r.rest.name + ' is currently closed');
  if (r.pricing.couponError) return fail(res, 400, r.pricing.couponError);
  let addr = q.user.addresses.find(a => a.id === b.addressId);
  if (!addr) return fail(res, 400, 'Please select a delivery address');
  const payment = ['COD', 'UPI', 'CARD', 'WALLET'].includes(b.payment) ? b.payment : 'COD';
  const riders = [['Ramesh Kumar', 'UP70 AB 1234'], ['Sanjay Yadav', 'UP70 CD 5521'], ['Imran Khan', 'UP70 EF 9087'], ['Deepak Singh', 'UP70 GH 3345'], ['Mohit Verma', 'UP70 JK 7712']];
  const rd = riders[Math.floor(Math.random() * riders.length)];
  db.meta.orderSeq++;
  const o = { id: 'FG' + db.meta.orderSeq, userId: q.user.id, userName: q.user.name, restaurantId: r.rest.id, restaurantName: r.rest.name, restaurantEmoji: r.rest.emoji, items: r.lines, pricing: r.pricing, coupon: r.coupon && r.coupon.code, address: addr, payment, instructions: clean(b.instructions, 200), createdAt: Date.now(), rider: { name: rd[0], vehicle: rd[1], phone: '98000' + (10000 + Math.floor(Math.random() * 89999)) }, rated: false };
  q.user.points = q.user.points - r.pricing.pointsUsed + r.pricing.pointsEarned;
  db.orders.push(o); save(); send(res, 201, { order: view(o), user: safeUser(q.user) });
});
route('GET', '/api/orders', 'user', async (q, res) => send(res, 200, { orders: db.orders.filter(o => o.userId === q.user.id).sort((a, b) => b.createdAt - a.createdAt).map(view) }));
route('GET', '/api/orders/:id', 'user', async (q, res) => {
  const o = db.orders.find(x => x.id === q.params.id && (x.userId === q.user.id || q.user.role === 'admin')); if (!o) return fail(res, 404, 'Order not found'); send(res, 200, { order: view(o) });
});
route('POST', '/api/orders/:id/cancel', 'user', async (q, res) => {
  const o = db.orders.find(x => x.id === q.params.id && x.userId === q.user.id); if (!o) return fail(res, 404, 'Order not found');
  const l = live(o); if (o.manualStatus || l.stage > 1) return fail(res, 400, 'This order can no longer be cancelled');
  o.manualStatus = 'Cancelled'; o.history = [{ status: 'Placed', at: o.createdAt }, { status: 'Cancelled', at: Date.now() }];
  q.user.points = Math.max(0, q.user.points + o.pricing.pointsUsed - o.pricing.pointsEarned); save(); send(res, 200, { order: view(o), user: safeUser(q.user) });
});
route('POST', '/api/orders/:id/rate', 'user', async (q, res) => {
  const o = db.orders.find(x => x.id === q.params.id && x.userId === q.user.id); if (!o) return fail(res, 404, 'Order not found');
  if (live(o).status !== 'Delivered') return fail(res, 400, 'You can rate only delivered orders'); if (o.rated) return fail(res, 400, 'Already rated');
  const rating = Math.round(Number(q.body.rating)); if (!(rating >= 1 && rating <= 5)) return fail(res, 400, 'Rating must be 1 to 5');
  const r = db.restaurants.find(x => x.id === o.restaurantId);
  db.reviews.push({ id: uid('v'), restaurantId: o.restaurantId, userId: q.user.id, userName: q.user.name, rating, text: clean(q.body.text, 300), createdAt: Date.now() });
  if (r) { r.rating = Math.round((r.rating * r.ratingCount + rating) / (r.ratingCount + 1) * 10) / 10; r.ratingCount++; }
  o.rated = rating; save(); send(res, 200, { order: view(o) });
});

// Admin
route('GET', '/api/admin/stats', 'admin', async (q, res) => {
  const ok = db.orders.filter(o => live(o).status !== 'Cancelled');
  const day = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
  const days = []; for (let i = 6; i >= 0; i--) { const s = today.getTime() - i * day; const list = ok.filter(o => o.createdAt >= s && o.createdAt < s + day); days.push({ date: new Date(s).toISOString().slice(0, 10), orders: list.length, revenue: list.reduce((t, o) => t + o.pricing.total, 0) }); }
  const byStatus = {}; db.orders.forEach(o => { const s = live(o).status; byStatus[s] = (byStatus[s] || 0) + 1; });
  const rev = {}, dish = {}, pay = {};
  ok.forEach(o => { rev[o.restaurantName] = (rev[o.restaurantName] || 0) + o.pricing.total; pay[o.payment] = (pay[o.payment] || 0) + 1; o.items.forEach(i => dish[i.name] = (dish[i.name] || 0) + i.qty); });
  const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  const revenue = ok.reduce((t, o) => t + o.pricing.total, 0);
  send(res, 200, { totals: { orders: db.orders.length, revenue, customers: db.users.filter(u => u.role === 'customer').length, restaurants: db.restaurants.length, avgOrder: ok.length ? Math.round(revenue / ok.length) : 0, active: db.orders.filter(o => { const s = live(o).stage; return s >= 0 && s < 4; }).length }, days, byStatus, topRestaurants: top(rev, 5).map(([name, value]) => ({ name, value })), topDishes: top(dish, 5).map(([name, value]) => ({ name, value })), payments: pay });
});
route('GET', '/api/admin/orders', 'admin', async (q, res) => send(res, 200, { orders: db.orders.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 150).map(view) }));
route('PUT', '/api/admin/orders/:id/status', 'admin', async (q, res) => {
  const o = db.orders.find(x => x.id === q.params.id); if (!o) return fail(res, 404, 'Order not found');
  const st = q.body.status; if (![...STAGES, 'Cancelled'].includes(st)) return fail(res, 400, 'Invalid status');
  const cur = live(o); if (!o.manualStatus) o.history = timeline(o);
  o.manualStatus = st; o.history = (o.history || []).filter(h => h.status !== st); o.history.push({ status: st, at: Date.now() }); save(); send(res, 200, { order: view(o), was: cur.status });
});
route('GET', '/api/admin/users', 'admin', async (q, res) => send(res, 200, { users: db.users.map(u => ({ ...safeUser(u), orders: db.orders.filter(o => o.userId === u.id).length, createdAt: u.createdAt })) }));
route('GET', '/api/admin/coupons', 'admin', async (q, res) => send(res, 200, { coupons: db.coupons }));
route('POST', '/api/admin/coupons', 'admin', async (q, res) => {
  const b = q.body, code = clean(b.code, 16).toUpperCase().replace(/\s/g, '');
  if (!code || db.coupons.find(c => c.code === code)) return fail(res, 400, 'Enter a unique coupon code');
  if (!['percent', 'flat', 'freedel'].includes(b.type)) return fail(res, 400, 'Invalid type');
  const c = { code, desc: clean(b.desc, 100) || code, type: b.type, value: Number(b.value) || 0, max: Number(b.max) || 0, min: Number(b.min) || 0, active: true };
  db.coupons.push(c); save(); send(res, 201, { coupon: c });
});
route('PUT', '/api/admin/coupons/:code', 'admin', async (q, res) => { const c = db.coupons.find(x => x.code === q.params.code); if (!c) return fail(res, 404, 'Not found'); c.active = !!q.body.active; save(); send(res, 200, { coupon: c }); });
route('DELETE', '/api/admin/coupons/:code', 'admin', async (q, res) => { db.coupons = db.coupons.filter(x => x.code !== q.params.code); save(); send(res, 200, { ok: true }); });
const rBody = (b) => ({ name: clean(b.name, 60), cuisines: String(b.cuisines || '').split(',').map(s => clean(s, 24)).filter(Boolean).slice(0, 4), emoji: clean(b.emoji, 4) || '🍽️', deliveryMins: Math.max(10, Math.min(90, parseInt(b.deliveryMins, 10) || 30)), costForTwo: Math.max(50, parseInt(b.costForTwo, 10) || 400), pureVeg: !!b.pureVeg, open: b.open !== false, offer: clean(b.offer, 60), address: clean(b.address, 100) });
route('POST', '/api/admin/restaurants', 'admin', async (q, res) => {
  const d = rBody(q.body); if (!d.name || !d.cuisines.length) return fail(res, 400, 'Name and at least one cuisine are required');
  const hue = Math.floor(Math.random() * 360), r = { id: uid('r'), ...d, hue: [hue, (hue + 30) % 360], rating: 4, ratingCount: 0, createdAt: Date.now() };
  db.restaurants.push(r); save(); send(res, 201, { restaurant: rid(r) });
});
route('PUT', '/api/admin/restaurants/:id', 'admin', async (q, res) => {
  const r = db.restaurants.find(x => x.id === q.params.id); if (!r) return fail(res, 404, 'Not found');
  const d = rBody({ ...r, cuisines: r.cuisines.join(','), ...q.body }); if (!d.name) return fail(res, 400, 'Name required'); Object.assign(r, d); save(); send(res, 200, { restaurant: rid(r) });
});
route('DELETE', '/api/admin/restaurants/:id', 'admin', async (q, res) => {
  db.restaurants = db.restaurants.filter(x => x.id !== q.params.id); db.menu = db.menu.filter(m => m.restaurantId !== q.params.id); save(); send(res, 200, { ok: true });
});
const mBody = (b) => ({ name: clean(b.name, 60), category: clean(b.category, 30) || 'Main', price: Math.max(1, Math.min(9999, parseInt(b.price, 10) || 0)), veg: b.veg !== false, emoji: clean(b.emoji, 4) || '🍽️', desc: clean(b.desc, 140), popular: !!b.popular, available: b.available !== false });
route('POST', '/api/admin/restaurants/:id/menu', 'admin', async (q, res) => {
  if (!db.restaurants.find(x => x.id === q.params.id)) return fail(res, 404, 'Restaurant not found');
  const d = mBody(q.body); if (!d.name || !q.body.price) return fail(res, 400, 'Name and price are required');
  const m = { id: uid('m'), restaurantId: q.params.id, ...d }; db.menu.push(m); save(); send(res, 201, { item: m });
});
route('PUT', '/api/admin/menu/:id', 'admin', async (q, res) => {
  const m = db.menu.find(x => x.id === q.params.id); if (!m) return fail(res, 404, 'Not found'); Object.assign(m, mBody({ ...m, ...q.body })); save(); send(res, 200, { item: m });
});
route('DELETE', '/api/admin/menu/:id', 'admin', async (q, res) => { db.menu = db.menu.filter(x => x.id !== q.params.id); save(); send(res, 200, { ok: true }); });

// ---------- static files ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname); if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return fail(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    const target = (!err && st.isFile()) ? file : path.join(PUBLIC, 'index.html');
    fs.readFile(target, (e, buf) => { if (e) return fail(res, 404, 'Not found'); res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(buf); });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost'), pathname = u.pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);
    const ctx = { query: Object.fromEntries(u.searchParams), body: {}, user: null };
    const userId = readToken((req.headers.authorization || '').replace('Bearer ', ''));
    if (userId) ctx.user = db.users.find(x => x.id === userId) || null;
    for (const r of routes) {
      if (r.method !== req.method) continue; const m = pathname.match(r.re); if (!m) continue;
      ctx.params = m.groups || {};
      if (r.auth && !ctx.user) return fail(res, 401, 'Please log in to continue');
      if (r.auth === 'admin' && ctx.user.role !== 'admin') return fail(res, 403, 'Admin access required');
      if (req.method === 'POST' || req.method === 'PUT') ctx.body = await body(req);
      return await r.fn(ctx, res);
    }
    fail(res, 404, 'API route not found');
  } catch (e) { console.error(e.message); fail(res, 400, e.message || 'Bad request'); }
});
server.listen(PORT, () => console.log(`\n  FoodieGo is running ->  http://localhost:${PORT}\n  Demo customer: demo@foodiego.com / demo123\n  Admin:         admin@foodiego.com / admin123\n`));
