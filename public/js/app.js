/* FoodieGo - core: state, auth, cart, navigation, router, layers */
'use strict';
FG.acts = {}; FG.routes = [];
FG.cart = JSON.parse(localStorage.getItem('fg_cart') || 'null') || { restId: null, restName: '', restEmoji: '', items: [], coupon: '', instructions: '' };
const saveCart = () => localStorage.setItem('fg_cart', JSON.stringify(FG.cart));
const cartCount = () => FG.cart.items.reduce((s, i) => s + i.qty, 0);
const cartSubtotal = () => FG.cart.items.reduce((s, i) => s + i.qty * i.price, 0);
const qtyOf = (id) => (FG.cart.items.find(i => i.menuId === id) || {}).qty || 0;

/* ---------- layers: drawer / modal ---------- */
FG.closeLayer = () => { $('#layer').innerHTML = ''; document.body.style.overflow = ''; FG.layerKind = null; };
FG.openLayer = (kind, html) => {
  $('#layer').innerHTML = `<div class="overlay" data-act="closeLayer"></div>${html}`;
  document.body.style.overflow = 'hidden'; FG.layerKind = kind;
};
FG.confirm = (title, msg, okText = 'Confirm') => new Promise(resolve => {
  FG.openLayer('confirm', `<div class="modal"><h2>${esc(title)}</h2><p class="muted" style="margin:10px 0 22px">${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-act="confirmNo">Cancel</button><button class="btn btn-primary" data-act="confirmYes">${esc(okText)}</button></div></div>`);
  FG._confirm = (v) => { FG.closeLayer(); resolve(v); };
});
FG.acts.closeLayer = () => FG.closeLayer();
FG.acts.confirmYes = () => FG._confirm(true);
FG.acts.confirmNo = () => FG._confirm(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && FG.layerKind) FG.closeLayer(); });

/* ---------- theme ---------- */
FG.acts.theme = () => {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t); localStorage.setItem('fg_theme', t); renderNav();
};

/* ---------- auth ---------- */
FG.setSession = (token, user) => { if (token) localStorage.setItem('fg_token', token); FG.user = user; renderNav(); renderBottom(); };
FG.logout = () => { localStorage.removeItem('fg_token'); FG.user = null; renderNav(); renderBottom(); toast('Logged out. See you soon!'); FG.go('/'); };
FG.requireLogin = (afterPath) => { if (FG.user) return true; FG.openAuth(afterPath); return false; };
FG.openAuth = (after, tab = 'login') => {
  FG._after = after;
  const reg = tab === 'register';
  FG.openLayer('auth', `<div class="modal"><div class="row between"><div class="logo"><div class="mark">🍔</div>Foodie<b>Go</b></div><button class="icon-btn" data-act="closeLayer" aria-label="Close">✕</button></div>
  <h2 style="margin:18px 0 4px">${reg ? 'Create your account' : 'Welcome back!'}</h2><p class="muted small" style="margin-bottom:18px">${reg ? 'Sign up and get 50 FoodPoints free.' : 'Log in to order, track and save favourites.'}</p>
  <div class="seg"><button class="${reg ? '' : 'on'}" data-act="authTab" data-tab="login">Login</button><button class="${reg ? 'on' : ''}" data-act="authTab" data-tab="register">Register</button></div>
  <form data-submit="auth" data-mode="${tab}" novalidate>
    ${reg ? '<div class="field"><label>Full name</label><input name="name" placeholder="e.g. Aarav Sharma" autocomplete="name" required></div>' : ''}
    <div class="field"><label>Email</label><input name="email" type="email" placeholder="you@example.com" autocomplete="email" required></div>
    ${reg ? '<div class="field"><label>Phone (optional)</label><input name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></div>' : ''}
    <div class="field"><label>Password</label><input name="password" type="password" placeholder="Min 6 characters" autocomplete="${reg ? 'new-password' : 'current-password'}" required></div>
    <div id="authErr" class="small" style="color:var(--red);min-height:20px;margin-bottom:6px"></div>
    <button class="btn btn-primary btn-block" type="submit">${reg ? 'Create account' : 'Login'}</button>
  </form>
  ${reg ? '' : `<div class="muted xs" style="margin:18px 0 8px;text-align:center">Quick demo access</div><div class="row"><button class="btn btn-soft btn-sm grow" data-act="demo" data-who="customer">👤 Demo customer</button><button class="btn btn-soft btn-sm grow" data-act="demo" data-who="admin">🛠️ Admin panel</button></div>`}</div>`);
};
FG.acts.authTab = (el) => FG.openAuth(FG._after, el.dataset.tab);
FG.acts.demo = async (el) => {
  const c = el.dataset.who === 'admin' ? ['admin@foodiego.com', 'admin123'] : ['demo@foodiego.com', 'demo123'];
  await FG.doAuth('login', { email: c[0], password: c[1] }, el.dataset.who === 'admin' ? '/admin' : null);
};
FG.doAuth = async (mode, data, redirect) => {
  try {
    const r = await api('/auth/' + mode, { method: 'POST', body: data });
    FG.setSession(r.token, r.user); FG.closeLayer(); toast(mode === 'register' ? 'Account created. Welcome, ' + r.user.name.split(' ')[0] + '!' : 'Welcome back, ' + r.user.name.split(' ')[0] + '!', 'ok');
    const go = redirect || FG._after; FG._after = null; if (go) FG.go(go); else FG.route();
  } catch (e) { const el = $('#authErr'); if (el) el.textContent = e.message; else toast(e.message, 'err'); }
};

/* ---------- cart ---------- */
FG.addToCart = async (item, rest) => {
  if (!rest.open && rest.open !== undefined) return toast(rest.name + ' is closed right now', 'err');
  if (FG.cart.restId && FG.cart.restId !== rest.id && FG.cart.items.length) {
    const ok = await FG.confirm('Start a new cart?', `Your cart has items from ${FG.cart.restName}. Replace them with items from ${rest.name}?`, 'Yes, start fresh');
    if (!ok) return; FG.cart = { restId: null, restName: '', restEmoji: '', items: [], coupon: '', instructions: '' };
  }
  FG.cart.restId = rest.id; FG.cart.restName = rest.name; FG.cart.restEmoji = rest.emoji || '🍽️';
  const ex = FG.cart.items.find(i => i.menuId === item.id);
  if (ex) ex.qty = Math.min(20, ex.qty + 1); else FG.cart.items.push({ menuId: item.id, name: item.name, price: item.price, veg: item.veg, emoji: item.emoji, qty: 1 });
  FG.cartChanged();
};
FG.changeQty = (id, d) => {
  const it = FG.cart.items.find(i => i.menuId === id); if (!it) return;
  it.qty = Math.min(20, it.qty + d); if (it.qty <= 0) FG.cart.items = FG.cart.items.filter(i => i !== it);
  if (!FG.cart.items.length) { FG.cart.restId = null; FG.cart.coupon = ''; }
  FG.cartChanged();
};
FG.cartChanged = () => { saveCart(); renderNav(); renderFab(); if (FG.layerKind === 'cart') FG.renderCartDrawer(); if (FG.onCart) FG.onCart(); };
FG.acts.add = (el) => FG.addToCart(JSON.parse(el.dataset.item), JSON.parse(el.dataset.rest));
FG.acts.inc = (el) => FG.changeQty(el.dataset.id, 1);
FG.acts.dec = (el) => FG.changeQty(el.dataset.id, -1);
FG.acts.clearCart = async () => { if (await FG.confirm('Clear cart?', 'Remove all items from your cart?', 'Clear')) { FG.cart = { restId: null, restName: '', restEmoji: '', items: [], coupon: '', instructions: '' }; FG.cartChanged(); } };

FG.openCart = () => { FG.openLayer('cart', '<aside class="drawer" id="cartDrawer"></aside>'); FG.renderCartDrawer(); };
FG.acts.openCart = () => FG.openCart();
FG.renderCartDrawer = async () => {
  const d = $('#cartDrawer'); if (!d) return;
  if (!FG.cart.items.length) { d.innerHTML = `<header><h2>Your cart</h2><button class="icon-btn" data-act="closeLayer">✕</button></header><div class="scroll"><div class="empty"><div class="em">🛒</div><h3>Your cart is empty</h3><p class="small" style="margin:8px 0 18px">Good food is always cooking. Add something tasty!</p><button class="btn btn-primary" data-act="closeLayer" data-go="/">Browse restaurants</button></div></div>`; return; }
  const lines = FG.cart.items.map(i => `<div class="cart-line">${vegMark(i.veg)}<div class="grow"><div class="bold small">${esc(i.name)}</div><div class="muted xs">${money(i.price)} each</div></div>
    <div class="stepper"><button data-act="dec" data-id="${esc(i.menuId)}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-act="inc" data-id="${esc(i.menuId)}" aria-label="Increase">+</button></div><div class="bold" style="min-width:64px;text-align:right">${money(i.price * i.qty)}</div></div>`).join('');
  d.innerHTML = `<header><div><h2>Your cart</h2><div class="muted small">${FG.cart.restEmoji} ${esc(FG.cart.restName)}</div></div><div class="row"><button class="btn btn-ghost btn-sm" data-act="clearCart">Clear</button><button class="icon-btn" data-act="closeLayer" aria-label="Close">✕</button></div></header>
  <div class="scroll">${lines}
    <div class="field" style="margin-top:16px"><label>Cooking instructions (optional)</label><textarea rows="2" maxlength="200" data-input="instr" placeholder="e.g. Less spicy, no onions">${esc(FG.cart.instructions)}</textarea></div>
    <div class="row" style="margin-bottom:6px"><input class="input" id="couponIn" placeholder="Coupon code" value="${esc(FG.cart.coupon)}" style="text-transform:uppercase"><button class="btn btn-soft" data-act="applyCoupon">Apply</button></div>
    <div id="couponMsg" class="xs" style="min-height:18px"></div><div class="hscroll" id="cpRow"></div><div id="bill" class="muted small">Calculating bill…</div></div>
  <footer><button class="btn btn-primary btn-block" data-act="checkout">Proceed to checkout →</button></footer>`;
  try {
    const q = await api('/quote', { method: 'POST', body: { restaurantId: FG.cart.restId, items: FG.cart.items.map(i => ({ menuId: i.menuId, qty: i.qty })), coupon: FG.cart.coupon } });
    if ($('#bill')) { $('#bill').outerHTML = `<div id="bill">${FG.billHTML(q.pricing)}</div>`; }
    const cm = $('#couponMsg'); if (cm) { if (q.pricing.couponError) { cm.style.color = 'var(--red)'; cm.textContent = q.pricing.couponError; } else if (FG.cart.coupon) { cm.style.color = 'var(--green)'; cm.textContent = `🎉 ${FG.cart.coupon} applied - you save ${money(q.pricing.discount)}`; } }
    const cps = await api('/coupons'); const row = $('#cpRow'); if (row) row.innerHTML = cps.coupons.map(c => `<button class="chip" data-act="useCoupon" data-code="${esc(c.code)}" title="${esc(c.desc)}">🏷️ ${esc(c.code)}</button>`).join('');
  } catch (e) { const b = $('#bill'); if (b) b.textContent = e.message; }
};
FG.billHTML = (p) => `<div class="bill-row"><span>Item total</span><span>${money(p.subtotal)}</span></div>
  ${p.discount ? `<div class="bill-row save"><span>Coupon discount</span><span>− ${money(p.discount)}</span></div>` : ''}
  ${p.pointsDiscount ? `<div class="bill-row save"><span>FoodPoints used (${p.pointsUsed})</span><span>− ${money(p.pointsDiscount)}</span></div>` : ''}
  <div class="bill-row"><span>Delivery fee ${p.deliveryFee ? '' : '<span class="tag green">FREE</span>'}</span><span>${money(p.deliveryFee)}</span></div>
  <div class="bill-row"><span>Platform fee</span><span>${money(p.platformFee)}</span></div>
  <div class="bill-row"><span>GST (5%)</span><span>${money(p.tax)}</span></div>
  ${p.tip ? `<div class="bill-row"><span>Delivery tip</span><span>${money(p.tip)}</span></div>` : ''}
  <div class="bill-row total"><span>To pay</span><span>${money(p.total)}</span></div>
  ${p.subtotal < p.freeDeliveryThreshold && p.deliveryFee ? `<div class="xs muted" style="margin-top:6px">Add ${money(p.freeDeliveryThreshold - p.subtotal)} more for free delivery</div>` : ''}`;
FG.acts.applyCoupon = () => { FG.cart.coupon = ($('#couponIn').value || '').trim().toUpperCase(); saveCart(); FG.renderCartDrawer(); };
FG.acts.useCoupon = (el) => { FG.cart.coupon = el.dataset.code; saveCart(); if (FG.layerKind === 'cart') FG.renderCartDrawer(); if (FG.onCart) FG.onCart(); };
FG.acts.checkout = () => { FG.closeLayer(); if (!FG.requireLogin('/checkout')) return; FG.go('/checkout'); };

/* ---------- navigation chrome ---------- */
function renderNav() {
  const u = FG.user, n = cartCount(), dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const loc = u && u.addresses[0] ? `${u.addresses[0].label}: ${u.addresses[0].line}` : 'Prayagraj, UP';
  $('#nav').innerHTML = `<div class="container"><a href="#/" class="logo"><div class="mark">🍔</div><span class="t">Foodie<b>Go</b></span></a>
  <a class="loc" href="#/profile" title="Delivery location">📍 ${esc(loc)}</a>
  <div class="nav-search"><span class="ico">🔍</span><input id="navQ" placeholder="Search restaurants, cuisines or dishes" autocomplete="off" aria-label="Search"><div id="suggest" class="suggest hidden"></div></div>
  <nav class="nav-links"><a href="#/" data-nav="/">Home</a>${u ? '<a href="#/orders" data-nav="/orders">Orders</a><a href="#/favorites" data-nav="/favorites">Favourites</a>' : ''}${u && u.role === 'admin' ? '<a href="#/admin" data-nav="/admin">Admin</a>' : ''}</nav>
  <div class="nav-right"><button class="icon-btn" data-act="theme" aria-label="Toggle dark mode" title="Dark / light">${dark ? '☀️' : '🌙'}</button>
  <button class="icon-btn" data-act="openCart" aria-label="Cart">🛒${n ? `<span class="badge-dot">${n}</span>` : ''}</button>
  ${u ? `<div class="user-menu"><button class="avatar" data-act="userMenu" aria-label="Account">${esc(u.name[0].toUpperCase())}</button><div class="dropdown hidden" id="ddm"><div class="head"><div class="bold">${esc(u.name)}</div><div class="muted xs">${esc(u.email)}</div>${u.role === 'customer' ? `<div class="tag amber" style="margin-top:8px">⭐ ${u.points} FoodPoints</div>` : '<div class="tag blue" style="margin-top:8px">Administrator</div>'}</div>
  <a href="#/profile">👤 My profile</a><a href="#/orders">📦 My orders</a><a href="#/favorites">❤️ Favourites</a>${u.role === 'admin' ? '<a href="#/admin">🛠️ Admin panel</a>' : ''}<button data-act="logout">🚪 Logout</button></div></div>` : '<button class="btn btn-primary btn-sm" data-act="login">Login</button>'}</div></div>`;
  const q = FG._q || ''; if ($('#navQ')) $('#navQ').value = q;
  markNav();
}
function markNav() { const h = location.hash.slice(1) || '/'; $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === '/' ? h === '/' : h.startsWith(a.dataset.nav))); renderBottom(); }
function renderBottom() {
  const h = location.hash.slice(1) || '/'; const a = (p, i, t) => `<a href="#${p}" class="${(p === '/' ? h === '/' : h.startsWith(p)) ? 'active' : ''}"><span>${i}</span>${t}</a>`;
  $('#bnav').innerHTML = a('/', '🏠', 'Home') + a('/favorites', '❤️', 'Favourites') + a('/orders', '📦', 'Orders') + a(FG.user ? (FG.user.role === 'admin' ? '/admin' : '/profile') : '/profile', FG.user && FG.user.role === 'admin' ? '🛠️' : '👤', FG.user && FG.user.role === 'admin' ? 'Admin' : 'Profile');
}
function renderFab() {
  const n = cartCount(), onCheckout = location.hash.startsWith('#/checkout') || location.hash.startsWith('#/admin');
  $('#fab').innerHTML = n && !onCheckout && !FG.layerKind ? `<button class="fab-cart" data-act="openCart"><span>${n} item${n > 1 ? 's' : ''} | ${money(cartSubtotal())}</span><span>View cart →</span></button>` : '';
}
FG.acts.login = () => FG.openAuth(null);
FG.acts.logout = () => FG.logout();
FG.acts.userMenu = () => $('#ddm').classList.toggle('hidden');

/* ---------- search box ---------- */
document.addEventListener('input', debounce(async (e) => {
  if (e.target.id !== 'navQ') return;
  const q = e.target.value.trim(); FG._q = q; const box = $('#suggest'); if (!box) return;
  if (q.length < 2) { box.classList.add('hidden'); return; }
  try {
    const r = await api('/search?q=' + encodeURIComponent(q));
    const rs = r.restaurants.slice(0, 4).map(x => `<a href="#/restaurant/${x.id}"><span style="font-size:1.4rem">${x.emoji}</span><div><div class="bold small">${esc(x.name)}</div><div class="muted xs">${esc(x.cuisines.join(', '))}</div></div></a>`).join('');
    const ds = r.dishes.slice(0, 4).map(x => `<a href="#/restaurant/${x.restaurantId}"><span style="font-size:1.4rem">${x.emoji}</span><div><div class="bold small">${esc(x.name)}</div><div class="muted xs">${esc(x.restaurantName)} · ${money(x.price)}</div></div></a>`).join('');
    box.innerHTML = (rs ? '<div class="sec">Restaurants</div>' + rs : '') + (ds ? '<div class="sec">Dishes</div>' + ds : '') + (rs || ds ? `<a href="#/search?q=${encodeURIComponent(q)}" style="color:var(--brand);font-weight:700">See all results →</a>` : '<div class="empty small" style="padding:20px">No matches found</div>');
    box.classList.remove('hidden');
  } catch (er) { }
}, 220));
document.addEventListener('keydown', e => { if (e.target.id === 'navQ' && e.key === 'Enter') { const q = e.target.value.trim(); if (q) { $('#suggest').classList.add('hidden'); FG.go('/search?q=' + encodeURIComponent(q)); } } });

/* ---------- global event delegation ---------- */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-search')) { const s = $('#suggest'); if (s) s.classList.add('hidden'); }
  if (!e.target.closest('.user-menu')) { const d = $('#ddm'); if (d) d.classList.add('hidden'); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = FG.acts[el.dataset.act]; if (!fn) return;
  e.stopPropagation(); fn(el, e); if (el.dataset.go) FG.go(el.dataset.go);
});
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-submit]'); if (!f) return; e.preventDefault();
  const fn = FG.subs[f.dataset.submit]; if (fn) { const btn = $('button[type=submit]', f); if (btn) btn.disabled = true; try { await fn(f, Object.fromEntries(new FormData(f))); } finally { if (btn) btn.disabled = false; } }
});
FG.subs = { auth: (f, d) => FG.doAuth(f.dataset.mode, d) };
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.input && FG.ins[t.dataset.input]) FG.ins[t.dataset.input](t, e); });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.change && FG.ins[t.dataset.change]) FG.ins[t.dataset.change](t, e); });
FG.ins = { instr: (t) => { FG.cart.instructions = t.value; saveCart(); } };

/* ---------- router ---------- */
FG.go = (p) => { if (location.hash === '#' + p) FG.route(); else location.hash = p; };
FG.route = async () => {
  FG.timers.forEach(clearInterval); FG.timers = []; FG.onCart = null;
  const raw = location.hash.slice(1) || '/', [path, qs] = raw.split('?'), query = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of FG.routes) {
    const m = path.match(r.re); if (!m) continue;
    if (r.auth && !FG.user) { $('#app').innerHTML = `<div class="empty"><div class="em">🔒</div><h2>Please log in</h2><p style="margin:8px 0 18px">You need an account to view this page.</p><button class="btn btn-primary" data-act="login">Login / Register</button></div>`; FG._after = raw; markNav(); renderFab(); return; }
    if (r.admin && (!FG.user || FG.user.role !== 'admin')) { $('#app').innerHTML = `<div class="empty"><div class="em">⛔</div><h2>Admin access only</h2><p style="margin:8px 0 18px">Login with an administrator account to open the dashboard.</p><button class="btn btn-primary" data-act="login">Login</button></div>`; markNav(); return; }
    try { await r.fn(m.slice(1).map(decodeURIComponent), query); } catch (e) { $('#app').innerHTML = `<div class="empty"><div class="em">😕</div><h2>Oops!</h2><p style="margin:8px 0 18px">${esc(e.message)}</p><button class="btn btn-primary" data-go="/" data-act="closeLayer">Back to home</button></div>`; }
    window.scrollTo({ top: 0 }); markNav(); renderFab(); return;
  }
  $('#app').innerHTML = `<div class="empty"><div class="em">🧭</div><h2>Page not found</h2><a class="btn btn-primary" href="#/" style="margin-top:16px">Go home</a></div>`;
};
FG.on = (pattern, opts, fn) => { if (typeof opts === 'function') { fn = opts; opts = {}; } FG.routes.push({ re: new RegExp('^' + pattern + '$'), fn, ...opts }); };
window.addEventListener('hashchange', () => { FG.closeLayer(); FG.route(); });

FG.footer = () => `<footer class="site"><div class="container"><div class="foot-grid"><div><div class="logo" style="color:#fff"><div class="mark">🍔</div>Foodie<b>Go</b></div><p class="small" style="margin-top:12px;max-width:340px;color:#9aa1b2">FoodieGo is a full-stack food delivery services platform built as a B.Tech CSE 3rd-year mini project at BRABU Rajkiya Engineering College, Pratapgarh.</p></div>
<div><h4>Explore</h4><a href="#/">Restaurants</a><a href="#/orders">My orders</a><a href="#/favorites">Favourites</a></div><div><h4>Account</h4><a href="#/profile">Profile</a><a href="#/checkout">Checkout</a><a href="#/admin">Admin panel</a></div><div><h4>Tech stack</h4><a>HTML5 · CSS3 · JavaScript</a><a>Node.js REST API</a><a>JSON data store</a></div></div><div class="small" style="margin-top:30px;color:#6f7686">© 2026 FoodieGo · Academic prototype - payments are simulated.</div></div></footer>`;

FG.boot = async () => {
  renderNav(); renderBottom();
  if (localStorage.getItem('fg_token')) { try { FG.user = (await api('/auth/me')).user; } catch (e) { localStorage.removeItem('fg_token'); } }
  renderNav(); renderBottom(); renderFab(); FG.route();
};
