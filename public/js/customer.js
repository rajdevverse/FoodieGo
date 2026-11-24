/* FoodieGo - customer views */
'use strict';
FG.f = { cuisine: '', veg: false, rating: false, fast: false, offers: false, sort: '' };
const J = (o) => esc(JSON.stringify(o));
const skeletons = (n = 6) => `<div class="grid">${Array.from({ length: n }, () => '<div class="skeleton"></div>').join('')}</div>`;
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-act][tabindex]')) e.target.click(); });

const rcard = (r, i = 0) => {
  const fav = FG.user && FG.user.favorites.includes(r.id);
  return `<article class="rcard ${r.open ? '' : 'closed'}" style="animation-delay:${Math.min(i, 12) * 45}ms" data-act="openRest" data-id="${r.id}" tabindex="0" role="link" aria-label="${esc(r.name)}">
  <div class="img" style="background:${gradient(r)}">${r.open ? '' : '<span class="closed-tag">CLOSED</span>'}<span class="e">${r.emoji}</span>
  <button class="fav ${fav ? 'on' : ''}" data-act="fav" data-id="${r.id}" aria-label="Favourite">${fav ? '♥' : '♡'}</button>${r.offer ? `<div class="offer-tag">🏷️ ${esc(r.offer)}</div>` : ''}</div>
  <div class="body"><div class="row between"><h3>${esc(r.name)}</h3><span class="rating ${ratingClass(r.rating)}">★ ${r.rating.toFixed(1)}</span></div>
  <div class="muted small" style="margin:4px 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.cuisines.join(' · '))}</div>
  <div class="row small muted wrap"><span>🕒 ${r.deliveryMins} mins</span><span>·</span><span>${money(r.costForTwo)} for two</span>${r.pureVeg ? '<span class="tag green" style="margin-left:auto">PURE VEG</span>' : ''}</div></div></article>`;
};
FG.acts.openRest = (el) => FG.go('/restaurant/' + el.dataset.id);
FG.acts.fav = async (el) => {
  if (!FG.requireLogin()) return;
  try { const r = await api('/favorites/' + el.dataset.id, { method: 'POST' }); FG.user.favorites = r.favorites; const on = r.favorites.includes(el.dataset.id); el.classList.toggle('on', on); el.textContent = on ? '♥' : '♡'; toast(on ? 'Added to favourites' : 'Removed from favourites', on ? 'ok' : ''); if (location.hash.startsWith('#/favorites')) FG.route(); } catch (e) { toast(e.message, 'err'); }
};

/* ================= HOME ================= */
FG.on('/', async () => {
  $('#app').innerHTML = `<section class="hero"><div class="big"></div><div class="big2"></div><span class="float" style="right:12%;top:14%">🍕</span><span class="float" style="right:26%;top:52%;animation-delay:-2s">🍔</span><span class="float" style="right:6%;top:58%;animation-delay:-4s;font-size:2.6rem">🍜</span>
  <h1>Hungry? Get your favourite food delivered fast.</h1><p>Order from the best restaurants in Prayagraj, track your rider live and enjoy exclusive offers every day.</p>
  <form class="hero-search" data-submit="heroSearch"><input name="q" placeholder="Try &quot;biryani&quot;, &quot;pizza&quot; or &quot;chai&quot;" aria-label="Search food"><button class="btn btn-primary" type="submit">Search</button></form>
  <div class="hero-stats" id="hstats"></div></section><div id="home">${skeletons(3)}</div>${''}`;
  const [all, pop, cps] = await Promise.all([api('/restaurants'), api('/popular'), api('/coupons')]);
  FG.all = all.restaurants;
  $('#hstats').innerHTML = `<div><b>${FG.all.length}+</b><span>Restaurants</span></div><div><b>${FG.all.reduce((s, r) => s + r.menuCount, 0)}+</b><span>Dishes</span></div><div><b>~28 min</b><span>Avg. delivery</span></div><div><b>4.4★</b><span>Avg. rating</span></div>`;
  const cu = {}; FG.all.forEach(r => r.cuisines.forEach(c => cu[c] = (cu[c] || 0) + 1));
  const cuisines = Object.entries(cu).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const offClass = ['o1', 'o2', 'o3', 'o4', 'o5'], offEm = ['🎁', '🍕', '💸', '🛵', '🎉'];
  $('#home').innerHTML = `
  <section class="section"><div class="section-head"><h2>🎟️ Offers for you</h2><span class="muted small hint">Tap a card to copy the code</span></div><div class="hscroll">${cps.coupons.map((c, i) => `<div class="offer-card ${offClass[i % 5]}" data-act="copyCode" data-code="${esc(c.code)}"><div class="bold" style="font-size:1.1rem">${esc(c.desc)}</div><span class="code">${esc(c.code)}</span><span class="em">${offEm[i % 5]}</span></div>`).join('')}</div></section>
  <section class="section"><div class="section-head"><h2>What's on your mind?</h2></div><div class="hscroll">${cuisines.map(c => `<div class="cuisine ${FG.f.cuisine === c ? 'active' : ''}" data-act="cuisine" data-c="${esc(c)}"><div class="c">${CUISINE_EMOJI[c] || '🍽️'}</div><span>${esc(c)}</span></div>`).join('')}</div></section>
  <section class="section"><div class="section-head"><h2>🔥 Popular dishes right now</h2></div><div class="hscroll">${pop.items.slice(0, 14).map(d => `<div class="dish-card" data-act="openRest" data-id="${d.restaurantId}" tabindex="0"><div class="pic">${d.emoji}</div>${vegMark(d.veg)} <span class="tag brand">Bestseller</span><h4 style="margin-top:8px">${esc(d.name)}</h4><div class="muted xs" style="margin:2px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.restaurantName)}</div><div class="row between"><b>${money(d.price)}</b><button class="add-btn" style="padding:6px 16px" data-act="add" data-item='${J({ id: d.id, name: d.name, price: d.price, veg: d.veg, emoji: d.emoji })}' data-rest='${J({ id: d.restaurantId, name: d.restaurantName, open: d.restaurantOpen })}'>ADD</button></div></div>`).join('')}</div></section>
  <section class="section" id="listing"><div class="section-head"><h2 id="rtitle">Restaurants to explore</h2><span class="muted small" id="rcount"></span></div>
  <div class="filters"><button class="chip ${FG.f.veg ? 'on' : ''}" data-act="flt" data-k="veg">🥬 Pure veg</button><button class="chip ${FG.f.rating ? 'on' : ''}" data-act="flt" data-k="rating">⭐ Rating 4.0+</button><button class="chip ${FG.f.fast ? 'on' : ''}" data-act="flt" data-k="fast">⚡ Fast delivery</button><button class="chip ${FG.f.offers ? 'on' : ''}" data-act="flt" data-k="offers">🏷️ Offers</button>
  <select class="chip" data-change="sort" aria-label="Sort"><option value="">Sort: Relevance</option><option value="rating" ${FG.f.sort === 'rating' ? 'selected' : ''}>Rating: High to low</option><option value="time" ${FG.f.sort === 'time' ? 'selected' : ''}>Delivery time</option><option value="costLow" ${FG.f.sort === 'costLow' ? 'selected' : ''}>Cost: Low to high</option><option value="costHigh" ${FG.f.sort === 'costHigh' ? 'selected' : ''}>Cost: High to low</option></select>
  ${FG.f.cuisine ? `<button class="chip on" data-act="cuisine" data-c="${esc(FG.f.cuisine)}">${esc(FG.f.cuisine)} ✕</button>` : ''}</div><div id="rgrid"></div></section>${FG.footer()}`;
  FG.loadGrid();
});
FG.loadGrid = async () => {
  const f = FG.f, p = new URLSearchParams(); if (f.cuisine) p.set('cuisine', f.cuisine); if (f.veg) p.set('veg', 1); if (f.rating) p.set('rating', 4); if (f.fast) p.set('fast', 1); if (f.offers) p.set('offers', 1); if (f.sort) p.set('sort', f.sort);
  const r = await api('/restaurants?' + p); if (!$('#rgrid')) return;
  $('#rcount').textContent = r.restaurants.length + ' restaurant' + (r.restaurants.length === 1 ? '' : 's');
  $('#rgrid').innerHTML = r.restaurants.length ? `<div class="grid">${r.restaurants.map(rcard).join('')}</div>` : '<div class="empty"><div class="em">🍽️</div><h3>No restaurants match your filters</h3><p class="small">Try removing a filter.</p></div>';
};
FG.subs.heroSearch = (f, d) => { if (d.q.trim()) FG.go('/search?q=' + encodeURIComponent(d.q.trim())); };
FG.acts.flt = (el) => { FG.f[el.dataset.k] = !FG.f[el.dataset.k]; el.classList.toggle('on'); FG.loadGrid(); };
FG.ins.sort = (t) => { FG.f.sort = t.value; FG.loadGrid(); };
FG.acts.cuisine = (el) => { FG.f.cuisine = FG.f.cuisine === el.dataset.c ? '' : el.dataset.c; FG.route().then(() => { const l = $('#listing'); if (l) l.scrollIntoView({ behavior: 'smooth' }); }); };
FG.acts.copyCode = (el) => { FG.cart.coupon = el.dataset.code; saveCart(); try { navigator.clipboard.writeText(el.dataset.code); } catch (e) { } toast(`Code ${el.dataset.code} copied & saved to your cart`, 'ok'); };

/* ================= RESTAURANT ================= */
FG.on('/restaurant/([^/]+)', async (id) => {
  $('#app').innerHTML = skeletons(2);
  const d = await api('/restaurants/' + id); FG.cur = d; FG.curTab = 'menu'; FG.menuQ = ''; FG.vegOnly = false;
  const r = d.restaurant, fav = FG.user && FG.user.favorites.includes(r.id);
  $('#app').innerHTML = `<div class="r-banner" style="background:${gradient(r)}"><span class="em">${r.emoji}</span><div class="row" style="gap:8px;margin-bottom:10px"><a href="#/" class="pill" style="background:rgba(255,255,255,.2);border-radius:999px;padding:5px 13px;font-size:.82rem;font-weight:700">← All restaurants</a>${r.open ? '' : '<span class="pill" style="background:#222;border-radius:999px;padding:5px 13px;font-size:.82rem;font-weight:700">CLOSED NOW</span>'}</div>
    <h1>${esc(r.name)}</h1><div style="opacity:.92;margin-top:4px">${esc(r.cuisines.join(' · '))} · ${esc(r.address)}</div>
    <div class="meta"><span class="pill">★ ${r.rating.toFixed(1)} (${r.ratingCount.toLocaleString('en-IN')})</span><span class="pill">🕒 ${r.deliveryMins} mins</span><span class="pill">${money(r.costForTwo)} for two</span>${r.pureVeg ? '<span class="pill">🥬 Pure veg</span>' : ''}${r.offer ? `<span class="pill">🏷️ ${esc(r.offer)}</span>` : ''}<button class="pill" data-act="fav" data-id="${r.id}" style="cursor:pointer">${fav ? '♥ Saved' : '♡ Save'}</button></div></div>
  <div class="tabs"><button class="tab on" data-act="rtab" data-t="menu">Order Online</button><button class="tab" data-act="rtab" data-t="reviews">Reviews (${d.reviews.length})</button></div><div id="rbody"></div>${FG.footer()}`;
  FG.renderRBody(); FG.onCart = () => { if (FG.curTab === 'menu') FG.renderMenu(); };
});
FG.acts.rtab = (el) => { FG.curTab = el.dataset.t; $$('.tab').forEach(t => t.classList.toggle('on', t === el)); FG.renderRBody(); };
FG.renderRBody = () => {
  const d = FG.cur; if (FG.curTab === 'menu') {
    const cats = [...new Set(d.menu.map(m => m.category))];
    $('#rbody').innerHTML = `<div class="menu-layout"><nav class="cat-nav"><a href="#" data-act="jump" data-c="__pop">🔥 Recommended</a>${cats.map(c => `<a href="#" data-act="jump" data-c="${esc(c)}">${esc(c)}</a>`).join('')}</nav><div><div class="row wrap" style="margin-bottom:6px"><input class="menu-search grow" style="margin:0" data-input="menuQ" placeholder="Search in ${esc(d.restaurant.name)}" aria-label="Search menu"><label class="check chip"><input type="checkbox" data-change="vegOnly"> 🥬 Veg only</label></div><div style="height:12px"></div><div id="menuList"></div></div></div>`;
    FG.renderMenu();
  } else FG.renderReviews();
};
FG.ins.menuQ = (t) => { FG.menuQ = t.value.toLowerCase(); FG.renderMenu(); };
FG.ins.vegOnly = (t) => { FG.vegOnly = t.checked; FG.renderMenu(); };
FG.acts.jump = (el, e) => { e.preventDefault(); const t = document.getElementById('cat-' + btoa(unescape(encodeURIComponent(el.dataset.c))).replace(/=/g, '')); if (t) t.scrollIntoView({ behavior: 'smooth' }); };
FG.renderMenu = () => {
  const d = FG.cur, r = d.restaurant, box = $('#menuList'); if (!box) return;
  let items = d.menu.filter(m => (!FG.menuQ || m.name.toLowerCase().includes(FG.menuQ) || m.desc.toLowerCase().includes(FG.menuQ)) && (!FG.vegOnly || m.veg));
  const mini = { id: r.id, name: r.name, emoji: r.emoji, open: r.open };
  const row = (m) => { const q = qtyOf(m.id), unavailable = !m.available || !r.open;
    return `<div class="item ${unavailable ? 'off' : ''}"><div class="pic">${m.emoji}</div><div class="info">${vegMark(m.veg)} ${m.popular ? '<span class="tag brand">🔥 Bestseller</span>' : ''}<h4>${esc(m.name)}</h4><p>${esc(m.desc)}</p><div class="bold" style="margin-top:6px">${money(m.price)}</div></div>
    ${!m.available ? '<span class="tag red">Sold out</span>' : q ? `<div class="stepper"><button data-act="dec" data-id="${m.id}" aria-label="Remove one">−</button><span>${q}</span><button data-act="inc" data-id="${m.id}" aria-label="Add one">+</button></div>` : `<button class="add-btn" data-act="add" data-item='${J({ id: m.id, name: m.name, price: m.price, veg: m.veg, emoji: m.emoji })}' data-rest='${J(mini)}'>ADD</button>`}</div>`; };
  const cid = (c) => 'cat-' + btoa(unescape(encodeURIComponent(c))).replace(/=/g, '');
  const pop = items.filter(m => m.popular);
  let html = pop.length && !FG.menuQ ? `<section class="menu-cat" id="${cid('__pop')}"><h3>🔥 Recommended (${pop.length})</h3>${pop.map(row).join('')}</section>` : '';
  [...new Set(items.map(m => m.category))].forEach(c => { const l = items.filter(m => m.category === c); html += `<section class="menu-cat" id="${cid(c)}"><h3>${esc(c)} (${l.length})</h3>${l.map(row).join('')}</section>`; });
  box.innerHTML = html || '<div class="empty"><div class="em">🔎</div><h3>No dishes found</h3></div>';
};
FG.renderReviews = () => {
  const d = FG.cur, r = d.restaurant;
  $('#rbody').innerHTML = `<div class="layout-2" style="margin-top:22px"><div>${d.reviews.length ? d.reviews.map(v => `<div class="review"><div class="row between"><div class="row"><div class="avatar" style="width:36px;height:36px;font-size:.9rem">${esc(v.userName[0])}</div><div><div class="bold small">${esc(v.userName)}</div><div class="muted xs">${fmtDate(v.createdAt)}</div></div></div><span class="stars">${stars(v.rating)}</span></div>${v.text ? `<p style="margin-top:10px">${esc(v.text)}</p>` : ''}</div>`).join('') : '<div class="empty"><div class="em">💬</div><h3>No reviews yet</h3></div>'}</div>
  <div class="panel sticky"><h3>Rate ${esc(r.name)}</h3><div class="star-pick" id="stars">${[1, 2, 3, 4, 5].map(n => `<span data-act="pickStar" data-n="${n}">★</span>`).join('')}</div><div class="field" style="margin-top:12px"><textarea id="revText" rows="3" maxlength="300" placeholder="Share your experience (optional)"></textarea></div><button class="btn btn-primary btn-block" data-act="postReview">Submit review</button></div></div>`;
};
FG.rating = 0;
FG.acts.pickStar = (el) => { FG.rating = +el.dataset.n; $$('#stars span, .rate-stars span').forEach(s => s.classList.toggle('on', +s.dataset.n <= FG.rating)); };
FG.acts.postReview = async () => {
  if (!FG.requireLogin()) return; if (!FG.rating) return toast('Please select a star rating', 'err');
  try { await api(`/restaurants/${FG.cur.restaurant.id}/reviews`, { method: 'POST', body: { rating: FG.rating, text: $('#revText').value } }); toast('Thanks for your review!', 'ok'); FG.rating = 0; FG.route(); } catch (e) { toast(e.message, 'err'); }
};

/* ================= SEARCH & FAVOURITES ================= */
FG.on('/search', async (m, q) => {
  const term = q.q || ''; FG._q = term; $('#app').innerHTML = skeletons(3);
  const r = await api('/search?q=' + encodeURIComponent(term)); if ($('#navQ')) $('#navQ').value = term;
  $('#app').innerHTML = `<h1 class="page-title">Results for “${esc(term)}”</h1><p class="muted">${r.restaurants.length} restaurants · ${r.dishes.length} dishes</p>
  ${r.restaurants.length ? `<section class="section"><div class="section-head"><h2>Restaurants</h2></div><div class="grid">${r.restaurants.map(rcard).join('')}</div></section>` : ''}
  ${r.dishes.length ? `<section class="section"><div class="section-head"><h2>Dishes</h2></div><div class="grid">${r.dishes.map(d => `<div class="item" style="margin:0"><div class="pic">${d.emoji}</div><div class="info">${vegMark(d.veg)}<h4>${esc(d.name)}</h4><p>${esc(d.restaurantName)}</p><div class="bold" style="margin-top:4px">${money(d.price)}</div></div><button class="add-btn" data-act="add" data-item='${J({ id: d.id, name: d.name, price: d.price, veg: d.veg, emoji: d.emoji })}' data-rest='${J({ id: d.restaurantId, name: d.restaurantName, open: d.restaurantOpen })}'>ADD</button></div>`).join('')}</div></section>` : ''}
  ${!r.restaurants.length && !r.dishes.length ? '<div class="empty"><div class="em">🔍</div><h2>Nothing found</h2><p>Try a different keyword like “pizza”, “paneer” or “coffee”.</p></div>' : ''}${FG.footer()}`;
});
FG.on('/favorites', { auth: true }, async () => {
  const r = await api('/restaurants'); const list = r.restaurants.filter(x => FG.user.favorites.includes(x.id));
  $('#app').innerHTML = `<h1 class="page-title">❤️ Your favourites</h1><p class="muted">Restaurants you've saved</p><div style="height:18px"></div>${list.length ? `<div class="grid">${list.map(rcard).join('')}</div>` : '<div class="empty"><div class="em">💔</div><h3>No favourites yet</h3><p class="small" style="margin:8px 0 18px">Tap the heart on any restaurant to save it here.</p><a class="btn btn-primary" href="#/">Explore restaurants</a></div>'}${FG.footer()}`;
});

/* ================= CHECKOUT ================= */
FG.co = { addressId: null, payment: 'UPI', tip: 0, usePoints: false };
FG.on('/checkout', { auth: true }, async () => {
  if (!FG.cart.items.length) { $('#app').innerHTML = '<div class="empty"><div class="em">🛒</div><h2>Your cart is empty</h2><a class="btn btn-primary" href="#/" style="margin-top:16px">Browse restaurants</a></div>'; return; }
  if (!FG.user.addresses.find(a => a.id === FG.co.addressId)) FG.co.addressId = FG.user.addresses[0] ? FG.user.addresses[0].id : null;
  FG.co.usePoints = false; FG.co.tip = 0;
  $('#app').innerHTML = `<h1 class="page-title">Checkout</h1><p class="muted" style="margin-bottom:20px">Almost there - review and place your order.</p><div class="layout-2"><div id="coLeft"></div><div class="sticky" id="coRight"></div></div>`;
  FG.renderCoLeft(); FG.renderCoRight(); FG.onCart = () => { if (!FG.cart.items.length) FG.go('/'); else FG.renderCoRight(); };
});
FG.renderCoLeft = () => {
  const u = FG.user, c = FG.co, pays = [['UPI', '📱', 'UPI', 'Google Pay, PhonePe, Paytm'], ['CARD', '💳', 'Credit / Debit card', 'Visa, Mastercard, RuPay'], ['WALLET', '👛', 'Wallet', 'Paytm / Amazon Pay (simulated)'], ['COD', '💵', 'Cash on delivery', 'Pay when your food arrives']];
  $('#coLeft').innerHTML = `<div class="panel" style="margin-bottom:20px"><div class="row between"><h3>📍 Delivery address</h3><button class="btn btn-soft btn-sm" data-act="toggleAddr">+ Add new</button></div>
  ${u.addresses.length ? u.addresses.map(a => `<label class="option ${c.addressId === a.id ? 'on' : ''}"><input type="radio" name="addr" data-change="pickAddr" value="${a.id}" ${c.addressId === a.id ? 'checked' : ''}><div><div class="bold">${esc(a.label)}</div><div class="muted small">${esc(a.line)}, ${esc(a.city)} - ${esc(a.pin)}</div></div></label>`).join('') : '<p class="muted small">No saved address yet. Add one to continue.</p>'}
  <form id="addrForm" class="${u.addresses.length ? 'hidden' : ''}" data-submit="addAddress" style="margin-top:12px">${FG.addrFields()}<button class="btn btn-primary" type="submit">Save address</button></form></div>
  <div class="panel" style="margin-bottom:20px"><h3>💳 Payment method</h3>${pays.map(p => `<label class="option ${c.payment === p[0] ? 'on' : ''}"><input type="radio" name="pay" data-change="pickPay" value="${p[0]}" ${c.payment === p[0] ? 'checked' : ''}><span style="font-size:1.6rem">${p[1]}</span><div><div class="bold">${p[2]}</div><div class="muted xs">${p[3]}</div></div></label>`).join('')}
  ${c.payment === 'UPI' ? '<div class="field"><label>UPI ID</label><input id="upiId" placeholder="name@bank" value="demo@upi"></div>' : ''}
  ${c.payment === 'CARD' ? '<div class="field"><label>Card number</label><input id="cardNo" inputmode="numeric" maxlength="19" placeholder="4111 1111 1111 1111" data-input="cardFmt"></div><div class="two"><div class="field"><label>Expiry (MM/YY)</label><input id="cardExp" maxlength="5" placeholder="09/28"></div><div class="field"><label>CVV</label><input id="cardCvv" type="password" maxlength="3" inputmode="numeric" placeholder="•••"></div></div><div class="muted xs">🔒 Demo only - card details are validated in your browser and never stored.</div>' : ''}</div>
  <div class="panel"><h3>🛵 Tip your delivery partner</h3><div class="row wrap">${[0, 10, 20, 50].map(t => `<button class="chip ${c.tip === t ? 'on' : ''}" data-act="tip" data-v="${t}">${t ? '₹' + t : 'No tip'}</button>`).join('')}</div></div>`;
};
FG.addrFields = () => `<div class="two"><div class="field"><label>Label</label><select name="label"><option>Home</option><option>Work</option><option>Other</option></select></div><div class="field"><label>PIN code</label><input name="pin" maxlength="6" inputmode="numeric" placeholder="211001" required></div></div><div class="field"><label>Address</label><input name="line" placeholder="House no, street, area" required></div><div class="field"><label>City</label><input name="city" value="Prayagraj" required></div>`;
FG.acts.toggleAddr = () => $('#addrForm').classList.toggle('hidden');
FG.ins.pickAddr = (t) => { FG.co.addressId = t.value; FG.renderCoLeft(); };
FG.ins.pickPay = (t) => { FG.co.payment = t.value; FG.renderCoLeft(); };
FG.ins.cardFmt = (t) => { t.value = t.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); };
FG.acts.tip = (el) => { FG.co.tip = +el.dataset.v; FG.renderCoLeft(); FG.renderCoRight(); };
FG.subs.addAddress = async (f, d) => {
  try { const r = await api('/auth/addresses', { method: 'POST', body: d }); FG.user = r.user; FG.co.addressId = r.user.addresses[r.user.addresses.length - 1].id; toast('Address saved', 'ok'); renderNav(); if (location.hash.startsWith('#/profile')) FG.route(); else FG.renderCoLeft(); } catch (e) { toast(e.message, 'err'); }
};
FG.renderCoRight = async () => {
  const box = $('#coRight'); if (!box) return; const c = FG.co, u = FG.user;
  const lines = FG.cart.items.map(i => `<div class="row between small" style="margin:6px 0"><span>${vegMark(i.veg)} ${esc(i.name)} × ${i.qty}</span><b>${money(i.price * i.qty)}</b></div>`).join('');
  box.innerHTML = `<div class="panel"><h3>${FG.cart.restEmoji} ${esc(FG.cart.restName)}</h3>${lines}<hr style="border:0;border-top:1px solid var(--border);margin:12px 0">
  <div class="row" style="margin-bottom:6px"><input class="input" id="couponIn" placeholder="Coupon code" value="${esc(FG.cart.coupon)}" style="text-transform:uppercase"><button class="btn btn-soft" data-act="applyCo">Apply</button></div><div id="couponMsg" class="xs" style="min-height:18px"></div>
  ${u.points > 0 ? `<label class="check" style="margin:8px 0 12px"><input type="checkbox" data-change="usePts" ${c.usePoints ? 'checked' : ''}> Use FoodPoints <span class="tag amber">⭐ ${u.points} available</span></label>` : ''}
  <div id="bill" class="muted small">Calculating…</div><button class="btn btn-primary btn-block" id="placeBtn" data-act="placeOrder" style="margin-top:16px">Place order</button><p class="xs muted" style="text-align:center;margin-top:10px">By placing the order you agree to our terms. You earn FoodPoints on every order.</p></div>`;
  try {
    const q = await api('/quote', { method: 'POST', body: { restaurantId: FG.cart.restId, items: FG.cart.items.map(i => ({ menuId: i.menuId, qty: i.qty })), coupon: FG.cart.coupon, tip: c.tip, usePoints: c.usePoints } });
    FG.lastQuote = q.pricing; if ($('#bill')) $('#bill').outerHTML = `<div id="bill">${FG.billHTML(q.pricing)}<div class="xs" style="margin-top:8px;color:var(--green)">⭐ You'll earn ${q.pricing.pointsEarned} FoodPoints</div></div>`;
    const cm = $('#couponMsg'); if (cm) { if (q.pricing.couponError) { cm.style.color = 'var(--red)'; cm.textContent = q.pricing.couponError; } else if (FG.cart.coupon) { cm.style.color = 'var(--green)'; cm.textContent = `🎉 ${FG.cart.coupon} applied - you save ${money(q.pricing.discount)}`; } }
    const pb = $('#placeBtn'); if (pb) pb.innerHTML = `Place order · ${money(q.pricing.total)}`;
  } catch (e) { const b = $('#bill'); if (b) b.textContent = e.message; }
};
FG.acts.applyCo = () => { FG.cart.coupon = ($('#couponIn').value || '').trim().toUpperCase(); saveCart(); FG.renderCoRight(); };
FG.ins.usePts = (t) => { FG.co.usePoints = t.checked; FG.renderCoRight(); };
FG.acts.placeOrder = async (el) => {
  const c = FG.co; if (!c.addressId) return toast('Please add and select a delivery address', 'err');
  if (c.payment === 'CARD') { const n = ($('#cardNo').value || '').replace(/\s/g, ''), ex = $('#cardExp').value, cv = $('#cardCvv').value; if (n.length !== 16 || !/^(0[1-9]|1[0-2])\/\d\d$/.test(ex) || !/^\d{3}$/.test(cv)) return toast('Enter valid card details (16 digits, MM/YY, 3-digit CVV)', 'err'); }
  if (c.payment === 'UPI' && !/^[\w.\-]{2,}@[\w]{2,}$/.test($('#upiId').value.trim())) return toast('Enter a valid UPI ID like name@bank', 'err');
  el.disabled = true; el.textContent = c.payment === 'COD' ? 'Placing order…' : 'Processing payment…'; await sleep(c.payment === 'COD' ? 300 : 1100);
  try {
    const r = await api('/orders', { method: 'POST', body: { restaurantId: FG.cart.restId, items: FG.cart.items.map(i => ({ menuId: i.menuId, qty: i.qty })), coupon: FG.cart.coupon, tip: c.tip, usePoints: c.usePoints, addressId: c.addressId, payment: c.payment, instructions: FG.cart.instructions } });
    FG.user = r.user; FG.cart = { restId: null, restName: '', restEmoji: '', items: [], coupon: '', instructions: '' }; saveCart(); renderNav(); renderFab(); confetti(); toast('Order placed successfully!', 'ok'); FG.go('/order/' + r.order.id);
  } catch (e) { toast(e.message, 'err'); el.disabled = false; FG.renderCoRight(); }
};

/* ================= ORDERS ================= */
const liveTag = (o) => { const s = o.live.status; return `<span class="status ${s === 'Delivered' ? 'st-Delivered' : s === 'Cancelled' ? 'st-Cancelled' : 'st-live'}">${s === 'Delivered' || s === 'Cancelled' ? s : '● ' + s}</span>`; };
FG.on('/orders', { auth: true }, async () => {
  const draw = async () => {
    const r = await api('/orders'); FG.orders = r.orders; if (!$('#olist')) return;
    $('#olist').innerHTML = r.orders.length ? r.orders.map(o => `<div class="order-card"><div class="row between wrap"><div class="row"><div class="pic" style="font-size:2rem;width:54px;height:54px;border-radius:16px;background:var(--brand-soft);display:grid;place-items:center">${o.restaurantEmoji}</div><div><div class="bold">${esc(o.restaurantName)}</div><div class="muted xs">#${o.id} · ${fmtDate(o.createdAt)}</div></div></div>${liveTag(o)}</div>
    <div class="muted small" style="margin:12px 0">${o.items.map(i => `${esc(i.name)} × ${i.qty}`).join(', ')}</div>
    <div class="row between wrap"><b>${money(o.pricing.total)} <span class="muted xs">· ${o.payment}</span></b><div class="row wrap"><button class="btn btn-ghost btn-sm" data-act="invoice" data-id="${o.id}">🧾 Invoice</button><button class="btn btn-ghost btn-sm" data-act="reorder" data-id="${o.id}">↻ Reorder</button><a class="btn btn-primary btn-sm" href="#/order/${o.id}">${o.live.stage >= 0 && o.live.stage < 4 ? '📍 Track order' : 'View details'}</a></div></div></div>`).join('') : '<div class="empty"><div class="em">📦</div><h3>No orders yet</h3><p class="small" style="margin:8px 0 18px">When you order, it will show up here.</p><a class="btn btn-primary" href="#/">Order now</a></div>';
  };
  $('#app').innerHTML = `<h1 class="page-title">📦 My orders</h1><p class="muted" style="margin-bottom:20px">Track current deliveries and reorder your favourites.</p><div id="olist">${skeletons(2)}</div>${FG.footer()}`;
  await draw(); FG.timers.push(setInterval(draw, 5000));
});
FG.acts.reorder = async (el) => {
  const o = (FG.orders || []).find(x => x.id === el.dataset.id) || FG.order; if (!o) return;
  const d = await api('/restaurants/' + o.restaurantId); if (!d.restaurant.open) return toast(d.restaurant.name + ' is closed right now', 'err');
  const items = o.items.map(i => { const m = d.menu.find(x => x.id === i.menuId); return m && m.available ? { menuId: m.id, name: m.name, price: m.price, veg: m.veg, emoji: m.emoji, qty: i.qty } : null; }).filter(Boolean);
  if (!items.length) return toast('Those items are unavailable right now', 'err');
  FG.cart = { restId: o.restaurantId, restName: d.restaurant.name, restEmoji: d.restaurant.emoji, items, coupon: '', instructions: '' }; FG.cartChanged(); FG.openCart(); toast('Items added to your cart', 'ok');
};
FG.acts.invoice = (el) => {
  const o = (FG.orders || []).find(x => x.id === el.dataset.id) || FG.order; if (!o) return; const p = o.pricing;
  const w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to print the invoice', 'err');
  w.document.write(`<html><head><title>Invoice ${o.id}</title><style>body{font-family:Arial,sans-serif;max-width:640px;margin:30px auto;color:#222}h1{color:#ff5a2c;margin:0}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}.r{display:flex;justify-content:space-between;padding:3px 0}.t{font-weight:bold;font-size:1.15em;border-top:2px solid #222;margin-top:6px;padding-top:8px}</style></head><body><h1>FoodieGo</h1><p>Tax Invoice · Order #${o.id}<br>${fmtDate(o.createdAt)}</p><p><b>${esc(o.restaurantName)}</b><br>Deliver to: ${esc(o.userName)}, ${esc(o.address.line)}, ${esc(o.address.city)} - ${esc(o.address.pin)}<br>Payment: ${o.payment}</p>
  <table><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.price * i.qty)}</td></tr>`).join('')}</table>
  <div class="r"><span>Item total</span><span>${money(p.subtotal)}</span></div>${p.discount ? `<div class="r"><span>Discount (${esc(o.coupon || '')})</span><span>- ${money(p.discount)}</span></div>` : ''}${p.pointsDiscount ? `<div class="r"><span>FoodPoints</span><span>- ${money(p.pointsDiscount)}</span></div>` : ''}<div class="r"><span>Delivery fee</span><span>${money(p.deliveryFee)}</span></div><div class="r"><span>Platform fee</span><span>${money(p.platformFee)}</span></div><div class="r"><span>GST (5%)</span><span>${money(p.tax)}</span></div>${p.tip ? `<div class="r"><span>Tip</span><span>${money(p.tip)}</span></div>` : ''}<div class="r t"><span>Total paid</span><span>${money(p.total)}</span></div><p style="color:#888;font-size:.85em;margin-top:30px">Thank you for ordering with FoodieGo. This is a computer generated invoice from an academic prototype.</p><script>window.onload=()=>window.print()<\/script></body></html>`); w.document.close();
};

/* ================= LIVE ORDER TRACKING ================= */
const STAGE_ICON = ['📝', '✅', '👨‍🍳', '🛵', '🏠'], STAGE_NAME = ['Order placed', 'Confirmed', 'Preparing', 'Out for delivery', 'Delivered'];
const ROUTE = [[12, 76], [36, 76], [36, 52], [62, 52], [62, 26], [86, 26]];
function along(p) { const segs = []; let tot = 0; for (let i = 1; i < ROUTE.length; i++) { const l = Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]); segs.push(l); tot += l; } let d = p * tot; for (let i = 0; i < segs.length; i++) { if (d <= segs[i] || i === segs.length - 1) { const t = Math.min(1, d / segs[i]); return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * t, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * t]; } d -= segs[i]; } return ROUTE[ROUTE.length - 1]; }
FG.on('/order/([^/]+)', { auth: true }, async (id) => {
  FG.lastStage = null; $('#app').innerHTML = skeletons(1);
  const load = async () => { const r = await api('/orders/' + id); FG.order = r.order; FG.fetchedAt = Date.now(); FG.drawTrack(); };
  await load(); FG.timers.push(setInterval(() => { const o = FG.order; if (o && o.live.stage >= 0 && o.live.stage < 4) load().catch(() => { }); }, 3000));
  FG.timers.push(setInterval(() => { const e = $('#eta'); if (e && FG.order) { const s = Math.max(0, FG.order.live.etaSeconds - Math.round((Date.now() - FG.fetchedAt) / 1000)); e.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } }, 1000));
});
FG.drawTrack = () => {
  const o = FG.order, l = o.live, p = o.pricing, cancelled = l.status === 'Cancelled', done = l.stage === 4;
  if (FG.lastStage !== null && FG.lastStage !== l.stage && l.stage >= 0) { toast(`${STAGE_ICON[l.stage]} ${STAGE_NAME[l.stage]}`, l.stage === 4 ? 'ok' : ''); if (l.stage === 4) confetti(); }
  const first = FG.lastStage === null || FG.drawnId !== o.id || FG.drawnStage !== l.stage || $('#app .rider') === null && l.stage >= 2;
  FG.lastStage = l.stage; FG.drawnId = o.id;
  if (!first) { const rd = $('#app .rider'); if (rd) { const [x, y] = along(l.stage === 4 ? 1 : l.progress); rd.style.left = x + '%'; rd.style.top = y + '%'; } return; }
  FG.drawnStage = l.stage;
  const head = cancelled ? ['Order cancelled', 'Your refund (if any) will be processed within 3-5 business days.'] : [['Order placed - waiting for the restaurant', 'Order confirmed by the restaurant', 'The kitchen is preparing your food', 'Your food is on the way', 'Delivered - enjoy your meal!'][l.stage], done ? 'Thank you for ordering with FoodieGo.' : 'Arriving in about'];
  const [rx, ry] = l.stage >= 3 ? along(l.stage === 4 ? 1 : l.progress) : ROUTE[0], tl = Object.fromEntries(o.timeline.map(t => [t.status, t.at]));
  const names = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
  $('#app').innerHTML = `<a href="#/orders" class="muted small" style="display:inline-block;margin-top:20px">← All orders</a>
  <div class="layout-2" style="margin-top:12px"><div><div class="panel" style="margin-bottom:20px"><div class="row between wrap"><div><div class="muted small">Order #${o.id} · ${fmtDate(o.createdAt)}</div><h1 style="font-size:1.55rem;letter-spacing:-.5px;margin-top:4px">${esc(head[0])}</h1></div>${!cancelled && !done ? `<div style="text-align:right"><div class="muted xs">${head[1]}</div><div id="eta" style="font-size:2rem;font-weight:800;color:var(--brand)">${Math.floor(l.etaSeconds / 60)}:${String(l.etaSeconds % 60).padStart(2, '0')}</div><div class="muted xs">min : sec (demo speed)</div></div>` : ''}</div>
  ${cancelled ? '<div class="empty" style="padding:30px"><div class="em">❌</div></div>' : `<div class="tracker"><div class="fill" style="width:${Math.max(0, l.stage) / 4 * 88}%"></div>${STAGE_NAME.map((n, i) => `<div class="tstep ${i < l.stage ? 'done' : i === l.stage ? (done ? 'done' : 'now') : ''}"><div class="dot">${i < l.stage || (i === l.stage && done) ? '✓' : STAGE_ICON[i]}</div><b>${n}</b><small>${tl[names[i]] ? fmtTime(tl[names[i]]) : '-'}</small></div>`).join('')}</div>`}</div>
  ${!cancelled ? `<div class="map" aria-label="Live delivery map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="var(--border)" stroke-width="5" fill="none" vector-effect="non-scaling-stroke" opacity=".9"><path d="M0 40H100M0 88H100M20 0V100M50 0V100M76 0V100" vector-effect="non-scaling-stroke" stroke-width="9" stroke="rgba(255,255,255,.55)"/></g><polyline points="${ROUTE.map(q => q.join(',')).join(' ')}" fill="none" stroke="var(--brand)" stroke-width="4" stroke-dasharray="2 2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".85"/></svg>
  <span class="pin" style="left:${ROUTE[0][0]}%;top:${ROUTE[0][1]}%">${o.restaurantEmoji}</span><span class="pin" style="left:${ROUTE[5][0]}%;top:${ROUTE[5][1]}%">🏠</span>${l.stage >= 2 ? `<span class="rider" style="left:${rx}%;top:${ry}%">🛵</span>` : ''}</div>` : ''}
  ${!cancelled && l.stage >= 2 ? `<div class="panel" style="margin-top:20px"><div class="row between wrap"><div class="row"><div class="avatar" style="width:52px;height:52px">${esc(o.rider.name[0])}</div><div><div class="bold">${esc(o.rider.name)}</div><div class="muted small">Delivery partner · ${esc(o.rider.vehicle)} · ⭐ 4.8</div></div></div><a class="btn btn-soft" href="tel:${esc(o.rider.phone)}">📞 Call rider</a></div></div>` : ''}
  ${done && !o.rated ? `<div class="panel" style="margin-top:20px"><h3>How was your food?</h3><div class="star-pick rate-stars">${[1, 2, 3, 4, 5].map(n => `<span data-act="pickStar" data-n="${n}">★</span>`).join('')}</div><div class="field" style="margin-top:12px"><textarea id="revText" rows="2" maxlength="300" placeholder="Tell us more (optional)"></textarea></div><button class="btn btn-primary" data-act="rateOrder">Submit rating</button></div>` : done && o.rated ? `<div class="panel" style="margin-top:20px"><span class="stars">${stars(o.rated)}</span> <span class="muted small">Thanks for rating this order!</span></div>` : ''}</div>
  <div class="sticky"><div class="panel"><h3>${o.restaurantEmoji} ${esc(o.restaurantName)}</h3>${o.items.map(i => `<div class="row between small" style="margin:6px 0"><span>${vegMark(i.veg)} ${esc(i.name)} × ${i.qty}</span><b>${money(i.price * i.qty)}</b></div>`).join('')}<hr style="border:0;border-top:1px solid var(--border);margin:12px 0">${FG.billHTML(p)}
  <div class="muted small" style="margin-top:14px"><b>Delivering to</b><br>${esc(o.address.label)} - ${esc(o.address.line)}, ${esc(o.address.city)} ${esc(o.address.pin)}<br><b>Payment:</b> ${o.payment}${o.coupon ? ` · <b>Coupon:</b> ${esc(o.coupon)}` : ''}${o.instructions ? `<br><b>Note:</b> ${esc(o.instructions)}` : ''}</div>
  <div class="row wrap" style="margin-top:16px">${!cancelled && !o.manualStatus && l.stage <= 1 ? '<button class="btn btn-danger btn-sm" data-act="cancelOrder">Cancel order</button>' : ''}<button class="btn btn-ghost btn-sm" data-act="reorder" data-id="${o.id}">↻ Reorder</button><button class="btn btn-ghost btn-sm" data-act="invoice" data-id="${o.id}">🧾 Invoice</button></div></div></div></div>${FG.footer()}`;
};
FG.acts.cancelOrder = async () => {
  if (!(await FG.confirm('Cancel this order?', 'The restaurant has not started preparing yet, so you can cancel for free.', 'Yes, cancel'))) return;
  try { const r = await api(`/orders/${FG.order.id}/cancel`, { method: 'POST' }); FG.order = r.order; FG.user = r.user; renderNav(); FG.drawTrack(); toast('Order cancelled', 'ok'); } catch (e) { toast(e.message, 'err'); }
};
FG.acts.rateOrder = async () => {
  if (!FG.rating) return toast('Please select a star rating', 'err');
  try { const r = await api(`/orders/${FG.order.id}/rate`, { method: 'POST', body: { rating: FG.rating, text: $('#revText').value } }); FG.order = r.order; FG.rating = 0; FG.drawTrack(); toast('Thanks for your feedback!', 'ok'); } catch (e) { toast(e.message, 'err'); }
};

/* ================= PROFILE ================= */
FG.on('/profile', async () => {
  if (!FG.user) { $('#app').innerHTML = '<div class="empty"><div class="em">👤</div><h2>Your profile</h2><p style="margin:8px 0 18px">Login to manage your details and addresses.</p><button class="btn btn-primary" data-act="login">Login / Register</button></div>'; return; }
  const u = FG.user;
  $('#app').innerHTML = `<h1 class="page-title">My profile</h1><div class="layout-2" style="margin-top:18px"><div><div class="panel" style="margin-bottom:20px"><h3>Personal details</h3><form data-submit="saveProfile"><div class="two"><div class="field"><label>Full name</label><input name="name" value="${esc(u.name)}" required></div><div class="field"><label>Phone</label><input name="phone" value="${esc(u.phone || '')}" maxlength="10"></div></div><div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div><button class="btn btn-primary" type="submit">Save changes</button></form></div>
  <div class="panel"><div class="row between"><h3>Saved addresses</h3></div>${u.addresses.map(a => `<div class="option" style="cursor:default"><span style="font-size:1.5rem">${a.label === 'Work' ? '🏢' : a.label === 'Home' ? '🏠' : '📍'}</span><div class="grow"><div class="bold">${esc(a.label)}</div><div class="muted small">${esc(a.line)}, ${esc(a.city)} - ${esc(a.pin)}</div></div><button class="btn btn-danger btn-sm" data-act="delAddr" data-id="${a.id}">Delete</button></div>`).join('') || '<p class="muted small" style="margin-bottom:12px">No addresses saved yet.</p>'}<form data-submit="addAddress" style="margin-top:16px"><div class="bold small" style="margin-bottom:10px">Add a new address</div>${FG.addrFields()}<button class="btn btn-soft" type="submit">+ Save address</button></form></div></div>
  <div class="sticky"><div class="panel" style="text-align:center"><div class="avatar" style="width:84px;height:84px;font-size:2.2rem;margin:0 auto 12px">${esc(u.name[0].toUpperCase())}</div><h3 style="margin:0">${esc(u.name)}</h3><div class="muted small">${esc(u.email)}</div>${u.role === 'customer' ? `<div style="margin:20px 0;padding:18px;border-radius:16px;background:linear-gradient(135deg,#ffb347,#ff5a2c);color:#fff"><div class="small" style="opacity:.9">FoodPoints balance</div><div style="font-size:2.4rem;font-weight:800">⭐ ${u.points}</div><div class="xs" style="opacity:.9">1 point = ₹1 off · earn 1 point per ₹20</div></div>` : ''}<div class="row" style="justify-content:center"><a class="btn btn-ghost btn-sm" href="#/orders">My orders</a><button class="btn btn-danger btn-sm" data-act="logout">Logout</button></div></div></div></div>${FG.footer()}`;
});
FG.subs.saveProfile = async (f, d) => { try { const r = await api('/auth/profile', { method: 'PUT', body: d }); FG.user = r.user; renderNav(); toast('Profile updated', 'ok'); } catch (e) { toast(e.message, 'err'); } };
FG.acts.delAddr = async (el) => { try { const r = await api('/auth/addresses/' + el.dataset.id, { method: 'DELETE' }); FG.user = r.user; renderNav(); FG.route(); toast('Address removed'); } catch (e) { toast(e.message, 'err'); } };
