/* FoodieGo - admin panel */
'use strict';
const A_TABS = [['/admin', '📊 Dashboard'], ['/admin/orders', '🧾 Orders'], ['/admin/restaurants', '🍽️ Restaurants'], ['/admin/coupons', '🏷️ Coupons'], ['/admin/users', '👥 Users']];
const adminHead = (active, sub = '') => `<div class="row between wrap"><div><h1 class="page-title" style="margin-bottom:0">Admin panel</h1><p class="muted small">${sub || 'Manage the whole FoodieGo platform'}</p></div></div><div class="admin-tabs">${A_TABS.map(t => `<a class="chip ${active === t[0] ? 'on' : ''}" href="#${t[0]}">${t[1]}</a>`).join('')}</div>`;
const STATUSES = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const hbars = (rows, fmt = (v) => v) => { const mx = Math.max(1, ...rows.map(r => r.value)); return rows.map(r => `<div class="hbar"><span class="lbl" title="${esc(r.name)}">${esc(r.name)}</span><div class="track"><i style="width:${r.value / mx * 100}%"></i></div><b>${fmt(r.value)}</b></div>`).join('') || '<p class="muted small">No data yet</p>'; };

/* ---------- dashboard ---------- */
FG.on('/admin', { admin: true }, async () => {
  const draw = async () => {
    const [s, o] = await Promise.all([api('/admin/stats'), api('/admin/orders')]); if (!$('#adm')) return;
    const t = s.totals, mx = Math.max(1, ...s.days.map(d => d.revenue));
    const col = { Placed: '#3b82f6', Confirmed: '#8b5cf6', Preparing: '#f5a623', 'Out for Delivery': '#ff5a2c', Delivered: '#12a05c', Cancelled: '#e5484d' };
    const tot = Object.values(s.byStatus).reduce((a, b) => a + b, 0) || 1; let acc = 0;
    const conic = Object.entries(s.byStatus).map(([k, v]) => { const a = acc / tot * 360; acc += v; return `${col[k] || '#999'} ${a}deg ${acc / tot * 360}deg`; }).join(',');
    $('#adm').innerHTML = `<div class="stats">
    <div class="stat"><span class="ic">💰</span><span class="muted small">Total revenue</span><b>${money(t.revenue)}</b></div><div class="stat"><span class="ic">🧾</span><span class="muted small">Total orders</span><b>${t.orders}</b></div><div class="stat"><span class="ic">🛵</span><span class="muted small">Active deliveries</span><b>${t.active}</b></div>
    <div class="stat"><span class="ic">📈</span><span class="muted small">Avg. order value</span><b>${money(t.avgOrder)}</b></div><div class="stat"><span class="ic">👥</span><span class="muted small">Customers</span><b>${t.customers}</b></div><div class="stat"><span class="ic">🍽️</span><span class="muted small">Restaurants</span><b>${t.restaurants}</b></div></div>
    <div class="layout-2" style="grid-template-columns:1.6fr 1fr"><div class="panel"><h3>Revenue - last 7 days</h3><div class="bars">${s.days.map(d => `<div class="bar"><em>${d.revenue ? '₹' + (d.revenue >= 1000 ? (d.revenue / 1000).toFixed(1) + 'k' : d.revenue) : ''}</em><i style="height:${Math.max(3, d.revenue / mx * 150)}px"></i><span>${new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span></div>`).join('')}</div></div>
    <div class="panel"><h3>Orders by status</h3><div class="row" style="gap:20px"><div class="donut" style="background:conic-gradient(${conic})"><b>${tot}</b></div><div class="col" style="gap:5px">${Object.entries(s.byStatus).map(([k, v]) => `<div class="small"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${col[k]};margin-right:6px"></span>${k} <b>${v}</b></div>`).join('')}</div></div></div></div>
    <div class="layout-2" style="grid-template-columns:1fr 1fr 1fr;margin-top:22px"><div class="panel"><h3>🏆 Top restaurants (revenue)</h3>${hbars(s.topRestaurants, money)}</div><div class="panel"><h3>🍛 Best-selling dishes</h3>${hbars(s.topDishes, v => v + ' sold')}</div><div class="panel"><h3>💳 Payment methods</h3>${hbars(Object.entries(s.payments).map(([name, value]) => ({ name, value })))}</div></div>
    <div class="section"><div class="section-head"><h2>Recent orders</h2><a class="btn btn-ghost btn-sm" href="#/admin/orders">View all →</a></div>${ordersTable(o.orders.slice(0, 6), false)}</div>`;
  };
  $('#app').innerHTML = `${adminHead('/admin', 'Live overview - refreshes automatically')}<div id="adm">${skeletons(3)}</div>`;
  await draw(); FG.timers.push(setInterval(() => draw().catch(() => { }), 6000));
});
function ordersTable(list, editable = true) {
  return `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Restaurant</th><th>Items</th><th>Total</th><th>Payment</th><th>Placed</th><th>Status</th></tr></thead><tbody>${list.map(o => `<tr><td><b>#${o.id}</b></td><td>${esc(o.userName)}</td><td>${o.restaurantEmoji} ${esc(o.restaurantName)}</td><td class="muted">${o.items.reduce((s, i) => s + i.qty, 0)}</td><td><b>${money(o.pricing.total)}</b></td><td><span class="tag">${o.payment}</span></td><td class="muted">${fmtDate(o.createdAt)}</td><td>${editable ? `<select class="input" style="padding:7px 10px;width:auto" data-change="ordStatus" data-id="${o.id}">${STATUSES.map(s => `<option ${s === o.live.status ? 'selected' : ''}>${s}</option>`).join('')}</select>` : liveTag(o)}</td></tr>`).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">No orders</td></tr>'}</tbody></table></div>`;
}
FG.ins.ordStatus = async (t) => { try { await api(`/admin/orders/${t.dataset.id}/status`, { method: 'PUT', body: { status: t.value } }); toast(`Order #${t.dataset.id} → ${t.value}`, 'ok'); } catch (e) { toast(e.message, 'err'); } };

/* ---------- orders ---------- */
FG.on('/admin/orders', { admin: true }, async () => {
  FG.af = FG.af || { s: '', q: '' };
  $('#app').innerHTML = `${adminHead('/admin/orders', 'Change an order status to move it through the delivery pipeline')}<div class="filters" style="position:static"><input class="input" style="max-width:280px" data-input="ordQ" placeholder="Search order, customer, restaurant" value="${esc(FG.af.q)}">${['', ...STATUSES].map(s => `<button class="chip ${FG.af.s === s ? 'on' : ''}" data-act="ordFlt" data-s="${s}">${s || 'All'}</button>`).join('')}</div><div id="otab">${skeletons(1)}</div>`;
  FG.allOrders = (await api('/admin/orders')).orders; FG.drawOrders();
});
FG.drawOrders = () => { const f = FG.af, q = f.q.toLowerCase(); $('#otab').innerHTML = ordersTable(FG.allOrders.filter(o => (!f.s || o.live.status === f.s) && (!q || (o.id + o.userName + o.restaurantName).toLowerCase().includes(q)))); };
FG.ins.ordQ = (t) => { FG.af.q = t.value; FG.drawOrders(); };
FG.acts.ordFlt = (el) => { FG.af.s = el.dataset.s; $$('[data-act=ordFlt]').forEach(c => c.classList.toggle('on', c === el)); FG.drawOrders(); };

/* ---------- restaurants ---------- */
FG.on('/admin/restaurants', { admin: true }, async () => {
  const r = (await api('/restaurants')).restaurants; FG.adminRests = r;
  $('#app').innerHTML = `${adminHead('/admin/restaurants')}<div class="row between" style="margin-bottom:14px"><b>${r.length} restaurants</b><button class="btn btn-primary" data-act="restForm">+ Add restaurant</button></div>
  <div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Cuisines</th><th>Rating</th><th>Delivery</th><th>Dishes</th><th>Status</th><th></th></tr></thead><tbody>${r.map(x => `<tr><td><div class="row"><span style="font-size:1.8rem">${x.emoji}</span><div><b>${esc(x.name)}</b><div class="muted xs">${esc(x.address)}</div></div></div></td><td class="muted">${esc(x.cuisines.join(', '))}</td><td><span class="rating ${ratingClass(x.rating)}">★ ${x.rating.toFixed(1)}</span></td><td>${x.deliveryMins} min</td><td>${x.menuCount}</td>
  <td><label class="check"><input type="checkbox" data-change="rOpen" data-id="${x.id}" ${x.open ? 'checked' : ''}> ${x.open ? 'Open' : 'Closed'}</label></td><td><div class="row"><a class="btn btn-soft btn-sm" href="#/admin/menu/${x.id}">Menu</a><button class="btn btn-ghost btn-sm" data-act="restForm" data-id="${x.id}">Edit</button><button class="btn btn-danger btn-sm" data-act="restDel" data-id="${x.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
});
FG.ins.rOpen = async (t) => { try { await api('/admin/restaurants/' + t.dataset.id, { method: 'PUT', body: { open: t.checked } }); toast(t.checked ? 'Restaurant opened' : 'Restaurant closed', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); } };
FG.acts.restDel = async (el) => { if (!(await FG.confirm('Delete restaurant?', 'This also deletes all of its menu items. This cannot be undone.', 'Delete'))) return; try { await api('/admin/restaurants/' + el.dataset.id, { method: 'DELETE' }); toast('Restaurant deleted', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); } };
FG.acts.restForm = (el) => {
  const r = el.dataset.id ? FG.adminRests.find(x => x.id === el.dataset.id) : { name: '', cuisines: [], emoji: '🍽️', deliveryMins: 30, costForTwo: 400, address: 'Prayagraj', offer: '', pureVeg: false, open: true };
  FG.openLayer('form', `<div class="modal"><div class="row between"><h2>${el.dataset.id ? 'Edit' : 'Add'} restaurant</h2><button class="icon-btn" data-act="closeLayer">✕</button></div><form data-submit="restSave" data-id="${el.dataset.id || ''}" style="margin-top:16px">
  <div class="two"><div class="field"><label>Name</label><input name="name" value="${esc(r.name)}" required></div><div class="field"><label>Emoji</label><input name="emoji" value="${esc(r.emoji)}" maxlength="4"></div></div>
  <div class="field"><label>Cuisines (comma separated)</label><input name="cuisines" value="${esc(r.cuisines.join(', '))}" placeholder="Pizza, Italian" required></div>
  <div class="two"><div class="field"><label>Delivery time (min)</label><input name="deliveryMins" type="number" min="10" max="90" value="${r.deliveryMins}"></div><div class="field"><label>Cost for two (₹)</label><input name="costForTwo" type="number" min="50" value="${r.costForTwo}"></div></div>
  <div class="field"><label>Address</label><input name="address" value="${esc(r.address)}"></div><div class="field"><label>Offer text</label><input name="offer" value="${esc(r.offer)}" placeholder="e.g. 20% OFF above ₹399"></div>
  <div class="row" style="gap:24px;margin-bottom:16px"><label class="check"><input type="checkbox" name="pureVeg" ${r.pureVeg ? 'checked' : ''}> Pure veg</label><label class="check"><input type="checkbox" name="open" ${r.open ? 'checked' : ''}> Open now</label></div><button class="btn btn-primary btn-block" type="submit">Save restaurant</button></form></div>`);
};
FG.subs.restSave = async (f, d) => {
  const body = { ...d, pureVeg: d.pureVeg === 'on', open: d.open === 'on' };
  try { await api(f.dataset.id ? '/admin/restaurants/' + f.dataset.id : '/admin/restaurants', { method: f.dataset.id ? 'PUT' : 'POST', body }); FG.closeLayer(); toast('Restaurant saved', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); }
};

/* ---------- menu manager ---------- */
FG.on('/admin/menu/([^/]+)', { admin: true }, async (id) => {
  const d = await api('/restaurants/' + id); FG.mm = d;
  $('#app').innerHTML = `${adminHead('/admin/restaurants', 'Menu manager')}<div class="row between wrap" style="margin-bottom:14px"><div class="row"><a class="btn btn-ghost btn-sm" href="#/admin/restaurants">← Back</a><h2>${d.restaurant.emoji} ${esc(d.restaurant.name)}</h2></div><button class="btn btn-primary" data-act="itemForm">+ Add dish</button></div>
  <div class="table-wrap"><table><thead><tr><th>Dish</th><th>Category</th><th>Price</th><th>Type</th><th>Bestseller</th><th>Available</th><th></th></tr></thead><tbody>${d.menu.map(m => `<tr><td><div class="row"><span style="font-size:1.6rem">${m.emoji}</span><div><b>${esc(m.name)}</b><div class="muted xs" style="max-width:300px">${esc(m.desc)}</div></div></div></td><td class="muted">${esc(m.category)}</td><td><b>${money(m.price)}</b></td><td>${vegMark(m.veg)}</td><td><label class="check"><input type="checkbox" data-change="mPop" data-id="${m.id}" ${m.popular ? 'checked' : ''}></label></td><td><label class="check"><input type="checkbox" data-change="mAvail" data-id="${m.id}" ${m.available ? 'checked' : ''}> ${m.available ? 'In stock' : 'Sold out'}</label></td><td><div class="row"><button class="btn btn-ghost btn-sm" data-act="itemForm" data-id="${m.id}">Edit</button><button class="btn btn-danger btn-sm" data-act="itemDel" data-id="${m.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
});
FG.ins.mAvail = async (t) => { try { await api('/admin/menu/' + t.dataset.id, { method: 'PUT', body: { available: t.checked } }); toast(t.checked ? 'Marked in stock' : 'Marked sold out', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); } };
FG.ins.mPop = async (t) => { try { await api('/admin/menu/' + t.dataset.id, { method: 'PUT', body: { popular: t.checked } }); toast('Updated', 'ok'); } catch (e) { toast(e.message, 'err'); } };
FG.acts.itemDel = async (el) => { if (!(await FG.confirm('Delete dish?', 'This dish will be removed from the menu.', 'Delete'))) return; try { await api('/admin/menu/' + el.dataset.id, { method: 'DELETE' }); toast('Dish deleted', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); } };
FG.acts.itemForm = (el) => {
  const m = el.dataset.id ? FG.mm.menu.find(x => x.id === el.dataset.id) : { name: '', category: '', price: '', emoji: '🍽️', desc: '', veg: true, popular: false, available: true };
  FG.openLayer('form', `<div class="modal"><div class="row between"><h2>${el.dataset.id ? 'Edit' : 'Add'} dish</h2><button class="icon-btn" data-act="closeLayer">✕</button></div><form data-submit="itemSave" data-id="${el.dataset.id || ''}" style="margin-top:16px">
  <div class="two"><div class="field"><label>Dish name</label><input name="name" value="${esc(m.name)}" required></div><div class="field"><label>Emoji</label><input name="emoji" value="${esc(m.emoji)}" maxlength="4"></div></div>
  <div class="two"><div class="field"><label>Category</label><input name="category" value="${esc(m.category)}" placeholder="e.g. Starters" required></div><div class="field"><label>Price (₹)</label><input name="price" type="number" min="1" value="${m.price}" required></div></div>
  <div class="field"><label>Description</label><textarea name="desc" rows="2" maxlength="140">${esc(m.desc)}</textarea></div>
  <div class="row wrap" style="gap:22px;margin-bottom:16px"><label class="check"><input type="checkbox" name="veg" ${m.veg ? 'checked' : ''}> Vegetarian</label><label class="check"><input type="checkbox" name="popular" ${m.popular ? 'checked' : ''}> Bestseller</label><label class="check"><input type="checkbox" name="available" ${m.available ? 'checked' : ''}> Available</label></div><button class="btn btn-primary btn-block" type="submit">Save dish</button></form></div>`);
};
FG.subs.itemSave = async (f, d) => {
  const body = { ...d, veg: d.veg === 'on', popular: d.popular === 'on', available: d.available === 'on' };
  try { await api(f.dataset.id ? '/admin/menu/' + f.dataset.id : `/admin/restaurants/${FG.mm.restaurant.id}/menu`, { method: f.dataset.id ? 'PUT' : 'POST', body }); FG.closeLayer(); toast('Dish saved', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); }
};

/* ---------- coupons ---------- */
FG.on('/admin/coupons', { admin: true }, async () => {
  const c = (await api('/admin/coupons')).coupons;
  $('#app').innerHTML = `${adminHead('/admin/coupons')}<div class="layout-2"><div class="table-wrap"><table><thead><tr><th>Code</th><th>Description</th><th>Type</th><th>Min order</th><th>Active</th><th></th></tr></thead><tbody>${c.map(x => `<tr><td><span class="tag brand" style="font-size:.85rem">${esc(x.code)}</span></td><td>${esc(x.desc)}</td><td class="muted">${x.type}</td><td>${money(x.min)}</td><td><label class="check"><input type="checkbox" data-change="cActive" data-code="${esc(x.code)}" ${x.active ? 'checked' : ''}></label></td><td><button class="btn btn-danger btn-sm" data-act="cDel" data-code="${esc(x.code)}">Delete</button></td></tr>`).join('')}</tbody></table></div>
  <div class="panel"><h3>Create coupon</h3><form data-submit="cSave"><div class="field"><label>Code</label><input name="code" placeholder="e.g. DIWALI25" required></div><div class="field"><label>Description</label><input name="desc" placeholder="25% OFF up to ₹150"></div><div class="two"><div class="field"><label>Type</label><select name="type"><option value="percent">Percent off</option><option value="flat">Flat off</option><option value="freedel">Free delivery</option></select></div><div class="field"><label>Value</label><input name="value" type="number" min="0" value="20"></div></div><div class="two"><div class="field"><label>Max discount (₹)</label><input name="max" type="number" min="0" value="100"></div><div class="field"><label>Min order (₹)</label><input name="min" type="number" min="0" value="199"></div></div><button class="btn btn-primary btn-block" type="submit">Create coupon</button></form></div></div>`;
});
FG.subs.cSave = async (f, d) => { try { await api('/admin/coupons', { method: 'POST', body: d }); toast('Coupon created', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); } };
FG.ins.cActive = async (t) => { try { await api('/admin/coupons/' + t.dataset.code, { method: 'PUT', body: { active: t.checked } }); toast(t.checked ? 'Coupon activated' : 'Coupon deactivated', 'ok'); } catch (e) { toast(e.message, 'err'); } };
FG.acts.cDel = async (el) => { try { await api('/admin/coupons/' + el.dataset.code, { method: 'DELETE' }); toast('Coupon deleted', 'ok'); FG.route(); } catch (e) { toast(e.message, 'err'); } };

/* ---------- users ---------- */
FG.on('/admin/users', { admin: true }, async () => {
  const u = (await api('/admin/users')).users;
  $('#app').innerHTML = `${adminHead('/admin/users')}<div class="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Orders</th><th>Points</th><th>Joined</th></tr></thead><tbody>${u.map(x => `<tr><td><div class="row"><div class="avatar" style="width:34px;height:34px;font-size:.85rem">${esc(x.name[0])}</div><b>${esc(x.name)}</b></div></td><td class="muted">${esc(x.email)}</td><td>${esc(x.phone || '-')}</td><td><span class="tag ${x.role === 'admin' ? 'blue' : ''}">${x.role}</span></td><td>${x.orders}</td><td>⭐ ${x.points}</td><td class="muted">${fmtDate(x.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
});
