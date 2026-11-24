'use strict';
// Generates data/db.json with dummy data: restaurants, menus, users, coupons, past orders, reviews.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { price } = require('../lib/pricing');

function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 32).toString('hex') };
}
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// [category, name, price, veg, emoji, description, popular]
const R = [
  { name: 'Spice Route Biryani House', cuisines: ['Biryani', 'Mughlai'], emoji: '🍛', hue: [14, 40], rating: 4.5, count: 1840, mins: 32, cost: 550, veg: false, offer: '50% OFF up to ₹100', addr: 'Civil Lines, Prayagraj',
    menu: [
      ['Biryani', 'Hyderabadi Chicken Dum Biryani', 289, false, '🍛', 'Slow-cooked basmati rice layered with marinated chicken and saffron.', 1],
      ['Biryani', 'Mutton Awadhi Biryani', 389, false, '🍖', 'Tender mutton pieces in fragrant Awadhi spices.', 1],
      ['Biryani', 'Paneer Tikka Biryani', 249, true, '🧀', 'Smoky paneer tikka cubes over aromatic rice.', 0],
      ['Biryani', 'Veg Dum Biryani', 219, true, '🥘', 'Seasonal vegetables in a sealed handi.', 0],
      ['Starters', 'Chicken 65', 219, false, '🍗', 'Crispy South-Indian style spicy chicken bites.', 1],
      ['Starters', 'Hara Bhara Kebab', 179, true, '🥬', 'Spinach and green pea patties, shallow fried.', 0],
      ['Sides', 'Mirchi Ka Salan', 79, true, '🌶️', 'Tangy peanut-sesame chilli curry.', 0],
      ['Sides', 'Boondi Raita', 59, true, '🥣', 'Chilled curd with crunchy boondi.', 0],
      ['Desserts', 'Double Ka Meetha', 99, true, '🍮', 'Hyderabadi bread pudding with rabri.', 0]] },
  { name: 'Bhojan Thali Ghar', cuisines: ['North Indian', 'Thali'], emoji: '🍱', hue: [28, 48], rating: 4.4, count: 2210, mins: 28, cost: 350, veg: true, offer: 'Free delivery', addr: 'Chowk, Prayagraj',
    menu: [
      ['Thali', 'Maharaja Thali', 299, true, '🍱', '2 sabzi, dal, rice, 4 roti, raita, salad and sweet.', 1],
      ['Thali', 'Mini Thali', 189, true, '🍽️', '1 sabzi, dal, rice, 3 roti and pickle.', 0],
      ['Mains', 'Dal Makhani', 189, true, '🥘', 'Overnight-simmered black lentils with butter and cream.', 1],
      ['Mains', 'Shahi Paneer', 229, true, '🧀', 'Paneer in a rich cashew-tomato gravy.', 1],
      ['Mains', 'Chole Bhature', 149, true, '🫓', 'Spicy chickpeas with two fluffy bhature.', 1],
      ['Breads', 'Butter Naan', 45, true, '🫓', 'Soft tandoor naan brushed with butter.', 0],
      ['Breads', 'Missi Roti', 35, true, '🫓', 'Gram-flour spiced flatbread.', 0],
      ['Sweets', 'Gulab Jamun (2 pcs)', 69, true, '🟤', 'Warm khoya dumplings in sugar syrup.', 0],
      ['Drinks', 'Sweet Lassi', 69, true, '🥛', 'Thick chilled sweet curd drink.', 0]] },
  { name: 'Pizza Piazza', cuisines: ['Pizza', 'Italian'], emoji: '🍕', hue: [350, 12], rating: 4.3, count: 1560, mins: 35, cost: 600, veg: false, offer: 'Buy 1 Get 1 on Medium', addr: 'Katra, Prayagraj',
    menu: [
      ['Pizzas', 'Margherita', 199, true, '🍕', 'Classic tomato, mozzarella and fresh basil.', 1],
      ['Pizzas', 'Farmhouse Veggie', 329, true, '🍕', 'Capsicum, onion, mushroom, sweet corn and olives.', 1],
      ['Pizzas', 'BBQ Chicken Supreme', 389, false, '🍗', 'Smoky BBQ chicken, onion and jalapeño.', 1],
      ['Pizzas', 'Peppy Paneer', 349, true, '🧀', 'Paneer, red paprika and crisp capsicum.', 0],
      ['Pasta', 'Alfredo Penne', 249, true, '🍝', 'Creamy white sauce penne with herbs.', 0],
      ['Pasta', 'Arrabbiata Spaghetti', 239, true, '🍝', 'Spicy tomato garlic sauce.', 0],
      ['Sides', 'Garlic Breadsticks', 109, true, '🥖', 'Buttery garlic sticks with cheese dip.', 1],
      ['Sides', 'Cheesy Dip', 25, true, '🧈', 'Creamy cheese dip.', 0],
      ['Desserts', 'Choco Lava Cake', 99, true, '🍫', 'Molten chocolate centre.', 0]] },
  { name: 'Burger Barn', cuisines: ['Burgers', 'Fast Food'], emoji: '🍔', hue: [38, 22], rating: 4.2, count: 2890, mins: 25, cost: 300, veg: false, offer: 'Flat ₹75 OFF above ₹599', addr: 'Allahpur, Prayagraj',
    menu: [
      ['Burgers', 'Classic Aloo Tikki Burger', 99, true, '🍔', 'Crispy potato patty, lettuce, tomato, mayo.', 1],
      ['Burgers', 'Double Cheese Veg Burger', 159, true, '🍔', 'Two patties, two cheese slices, house sauce.', 1],
      ['Burgers', 'Crispy Chicken Burger', 169, false, '🍔', 'Buttermilk fried chicken with slaw.', 1],
      ['Burgers', 'Smash Mutton Burger', 219, false, '🍔', 'Juicy smashed patty, caramelised onion.', 0],
      ['Fries & Sides', 'Peri Peri Fries', 99, true, '🍟', 'Crinkle-cut fries tossed in peri peri.', 1],
      ['Fries & Sides', 'Onion Rings', 89, true, '🧅', 'Golden beer-batter onion rings.', 0],
      ['Fries & Sides', 'Chicken Nuggets (6)', 129, false, '🍗', 'Crispy nuggets with mustard dip.', 0],
      ['Shakes', 'Oreo Thick Shake', 139, true, '🥤', 'Blended Oreo, vanilla ice cream, milk.', 1],
      ['Shakes', 'Cold Coffee', 119, true, '🧋', 'Strong chilled coffee with ice cream.', 0]] },
  { name: 'Dragon Wok', cuisines: ['Chinese', 'Asian'], emoji: '🥡', hue: [0, 345], rating: 4.1, count: 1275, mins: 30, cost: 450, veg: false, offer: '20% OFF on first order', addr: 'Lukerganj, Prayagraj',
    menu: [
      ['Noodles & Rice', 'Hakka Noodles (Veg)', 169, true, '🍜', 'Wok-tossed noodles with crunchy vegetables.', 1],
      ['Noodles & Rice', 'Chicken Schezwan Fried Rice', 219, false, '🍚', 'Fiery Schezwan rice with chicken.', 1],
      ['Noodles & Rice', 'Veg Manchurian Rice Bowl', 189, true, '🥡', 'Fried rice topped with veg manchurian.', 0],
      ['Starters', 'Chilli Paneer Dry', 229, true, '🌶️', 'Crispy paneer in spicy soy glaze.', 1],
      ['Starters', 'Dragon Chicken', 249, false, '🍗', 'Chef special crispy chicken in hot sauce.', 1],
      ['Starters', 'Veg Spring Rolls', 149, true, '🥟', 'Golden rolls with sweet chilli dip.', 0],
      ['Soups', 'Hot & Sour Soup', 109, true, '🍲', 'Peppery tangy soup.', 0],
      ['Momos', 'Steamed Veg Momos (8)', 119, true, '🥟', 'Soft dumplings with red chutney.', 1],
      ['Momos', 'Chicken Kurkure Momos (8)', 169, false, '🥟', 'Crunchy coated fried momos.', 0]] },
  { name: 'Dosa Darbar', cuisines: ['South Indian'], emoji: '🫓', hue: [48, 30], rating: 4.6, count: 3120, mins: 27, cost: 280, veg: true, offer: 'Free Filter Coffee above ₹300', addr: 'Colonelganj, Prayagraj',
    menu: [
      ['Dosas', 'Masala Dosa', 119, true, '🫓', 'Crisp rice crepe with spiced potato filling.', 1],
      ['Dosas', 'Mysore Masala Dosa', 139, true, '🫓', 'Red chutney spread with potato masala.', 1],
      ['Dosas', 'Paneer Cheese Dosa', 169, true, '🧀', 'Stuffed with paneer bhurji and cheese.', 0],
      ['Idli & Vada', 'Idli Sambar (3 pcs)', 89, true, '⚪', 'Steamed rice cakes with sambar and chutneys.', 1],
      ['Idli & Vada', 'Medu Vada (2 pcs)', 79, true, '🍩', 'Crispy lentil doughnuts.', 0],
      ['Uttapam', 'Onion Tomato Uttapam', 129, true, '🥞', 'Thick pancake topped with veggies.', 0],
      ['Rice', 'Curd Rice', 99, true, '🍚', 'Cooling tempered yoghurt rice.', 0],
      ['Beverages', 'Filter Coffee', 49, true, '☕', 'Traditional decoction coffee.', 1],
      ['Beverages', 'Rose Milk', 59, true, '🥛', 'Chilled rose-flavoured milk.', 0]] },
  { name: 'Chai & Chaat Corner', cuisines: ['Street Food', 'Snacks'], emoji: '🥟', hue: [30, 8], rating: 4.5, count: 4050, mins: 20, cost: 180, veg: true, offer: '₹50 OFF above ₹199', addr: 'Sangam Road, Prayagraj',
    menu: [
      ['Chaat', 'Aloo Tikki Chaat', 79, true, '🥔', 'Crisp tikki with curd, chutneys and sev.', 1],
      ['Chaat', 'Pani Puri (8 pcs)', 59, true, '🥟', 'Crunchy puris with spiced mint water.', 1],
      ['Chaat', 'Dahi Papdi Chaat', 89, true, '🥣', 'Papdi, curd, tamarind and pomegranate.', 0],
      ['Snacks', 'Samosa (2 pcs)', 40, true, '🔺', 'Flaky pastry with spiced potato.', 1],
      ['Snacks', 'Vada Pav', 35, true, '🍔', 'Mumbai style potato fritter in a bun.', 1],
      ['Snacks', 'Kachori with Aloo Sabzi', 69, true, '🥘', 'Banarasi-style kachori and tangy sabzi.', 0],
      ['Chai', 'Masala Chai (Kulhad)', 25, true, '☕', 'Ginger-cardamom chai in a clay cup.', 1],
      ['Chai', 'Elaichi Chai', 25, true, '☕', 'Cardamom infused milk tea.', 0],
      ['Chai', 'Bun Maska', 35, true, '🍞', 'Soft bun with butter, dunk in chai.', 0]] },
  { name: 'Sweet Tooth Mithai', cuisines: ['Desserts', 'Sweets'], emoji: '🍰', hue: [320, 340], rating: 4.7, count: 980, mins: 24, cost: 300, veg: true, offer: 'Free sweet box on ₹699', addr: 'Johnstonganj, Prayagraj',
    menu: [
      ['Mithai', 'Kaju Katli (250g)', 299, true, '🔷', 'Silver-leaf cashew fudge.', 1],
      ['Mithai', 'Motichoor Laddu (4 pcs)', 149, true, '🟡', 'Fine boondi ladoos in pure ghee.', 1],
      ['Mithai', 'Rasmalai (2 pcs)', 129, true, '🍮', 'Soft paneer discs in saffron milk.', 1],
      ['Mithai', 'Jalebi (200g)', 89, true, '🌀', 'Hot, crisp, syrup-soaked spirals.', 0],
      ['Cakes', 'Chocolate Truffle Pastry', 99, true, '🍰', 'Rich dark chocolate ganache pastry.', 1],
      ['Cakes', 'Black Forest Cake (500g)', 449, true, '🎂', 'Cherry, cream and chocolate shavings.', 0],
      ['Frozen', 'Kulfi Falooda', 119, true, '🍨', 'Matka kulfi with falooda and rose syrup.', 0],
      ['Frozen', 'Butterscotch Ice Cream Tub', 199, true, '🍦', '500ml tub with caramel crunch.', 0],
      ['Drinks', 'Badam Thandai', 89, true, '🥛', 'Chilled almond and saffron milk.', 0]] },
  { name: 'Kebab Junction', cuisines: ['Mughlai', 'Kebabs'], emoji: '🍢', hue: [8, 30], rating: 4.4, count: 1420, mins: 34, cost: 500, veg: false, offer: '15% OFF above ₹499', addr: 'Muthiganj, Prayagraj',
    menu: [
      ['Kebabs', 'Galouti Kebab (4 pcs)', 289, false, '🍢', 'Melt-in-mouth minced mutton kebabs.', 1],
      ['Kebabs', 'Chicken Seekh Kebab', 249, false, '🍢', 'Spiced minced chicken on skewers.', 1],
      ['Kebabs', 'Malai Soya Chaap', 199, true, '🌿', 'Creamy marinated soya chaap tikka.', 0],
      ['Curries', 'Butter Chicken', 299, false, '🍗', 'Classic tomato-butter gravy with tandoori chicken.', 1],
      ['Curries', 'Mutton Rogan Josh', 369, false, '🥘', 'Kashmiri-style slow cooked mutton.', 0],
      ['Rolls', 'Chicken Seekh Roll', 149, false, '🌯', 'Seekh wrapped in laccha paratha.', 1],
      ['Rolls', 'Paneer Tikka Roll', 129, true, '🌯', 'Paneer tikka, onions, mint chutney.', 0],
      ['Breads', 'Laccha Paratha', 49, true, '🫓', 'Flaky layered tandoor paratha.', 0],
      ['Drinks', 'Masala Soda', 49, true, '🥤', 'Fizzy spiced lemon soda.', 0]] },
  { name: 'Healthy Bowl Co.', cuisines: ['Healthy', 'Salads'], emoji: '🥗', hue: [130, 160], rating: 4.3, count: 640, mins: 22, cost: 400, veg: true, offer: '10% OFF on subscriptions', addr: 'Stanley Road, Prayagraj',
    menu: [
      ['Bowls', 'Quinoa Power Bowl', 249, true, '🥗', 'Quinoa, chickpeas, avocado, greens, lemon tahini.', 1],
      ['Bowls', 'Paneer Protein Bowl', 269, true, '🥙', 'Grilled paneer, brown rice, roasted veg.', 1],
      ['Bowls', 'Mediterranean Hummus Bowl', 239, true, '🥙', 'Hummus, falafel, olives, cucumber.', 0],
      ['Salads', 'Greek Salad', 189, true, '🥒', 'Feta, olives, tomato, cucumber.', 0],
      ['Salads', 'Sprout & Corn Chaat Salad', 149, true, '🌽', 'Fibre-rich sprouts with lime.', 0],
      ['Juices', 'Green Detox Juice', 129, true, '🥬', 'Spinach, apple, cucumber, mint.', 1],
      ['Juices', 'Fresh Orange Juice', 99, true, '🍊', 'Cold-pressed, no added sugar.', 0],
      ['Snacks', 'Roasted Makhana', 99, true, '🍿', 'Lightly salted fox nuts.', 0],
      ['Snacks', 'Peanut Butter Oat Bar', 79, true, '🍫', 'Energy bar with oats and jaggery.', 0]] },
  { name: 'Tandoori Nights', cuisines: ['North Indian', 'Tandoor'], emoji: '🍗', hue: [4, 24], rating: 4.2, count: 1730, mins: 36, cost: 650, veg: false, offer: 'Free dessert above ₹799', addr: 'Naini, Prayagraj',
    menu: [
      ['Tandoor', 'Tandoori Chicken (Full)', 449, false, '🍗', 'Whole chicken marinated in yoghurt and spices.', 1],
      ['Tandoor', 'Afghani Chicken Tikka', 289, false, '🍗', 'Creamy cashew marinade, charred in the tandoor.', 1],
      ['Tandoor', 'Paneer Angara Tikka', 249, true, '🧀', 'Smoked red-chilli paneer.', 1],
      ['Mains', 'Kadhai Paneer', 239, true, '🥘', 'Capsicum and paneer in kadhai masala.', 0],
      ['Mains', 'Chicken Handi', 329, false, '🍲', 'Rustic clay-pot chicken curry.', 0],
      ['Mains', 'Dal Tadka', 169, true, '🍲', 'Yellow dal with ghee tempering.', 0],
      ['Breads', 'Garlic Naan', 59, true, '🫓', 'Tandoor naan with garlic and coriander.', 1],
      ['Rice', 'Jeera Rice', 109, true, '🍚', 'Cumin-flavoured basmati.', 0],
      ['Desserts', 'Phirni', 89, true, '🍮', 'Ground rice pudding in earthen bowl.', 0]] },
  { name: 'Brew & Bites Café', cuisines: ['Beverages', 'Cafe'], emoji: '🧋', hue: [24, 340], rating: 4.4, count: 1195, mins: 21, cost: 350, veg: true, offer: '2 shakes @ ₹199', addr: 'Civil Lines, Prayagraj', open: false,
    menu: [
      ['Coffee', 'Cappuccino', 149, true, '☕', 'Double shot espresso with foamed milk.', 1],
      ['Coffee', 'Hazelnut Latte', 169, true, '☕', 'Silky latte with hazelnut syrup.', 0],
      ['Coffee', 'Iced Americano', 129, true, '🧊', 'Chilled espresso over ice.', 0],
      ['Shakes', 'Belgian Chocolate Shake', 179, true, '🥤', 'Dense chocolate shake with whipped cream.', 1],
      ['Shakes', 'Mango Cheesecake Shake', 189, true, '🥭', 'Alphonso mango with cheesecake crumble.', 0],
      ['Bites', 'Veg Grilled Sandwich', 139, true, '🥪', 'Loaded veggies, cheese and mint mayo.', 1],
      ['Bites', 'Cheese Garlic Toast', 99, true, '🍞', 'Toasted bread with garlic butter.', 0],
      ['Bites', 'Blueberry Muffin', 89, true, '🧁', 'Fresh-baked muffin.', 0],
      ['Bites', 'Nachos with Salsa', 149, true, '🌮', 'Corn chips, salsa, cheese sauce.', 0]] }
];

const COUPONS = [
  { code: 'WELCOME50', desc: '50% OFF up to ₹100 on orders above ₹199', type: 'percent', value: 50, max: 100, min: 199, active: true },
  { code: 'TASTY30', desc: '30% OFF up to ₹120 on orders above ₹349', type: 'percent', value: 30, max: 120, min: 349, active: true },
  { code: 'FLAT75', desc: 'Flat ₹75 OFF on orders above ₹599', type: 'flat', value: 75, min: 599, active: true },
  { code: 'FREEDEL', desc: 'Free delivery on orders above ₹149', type: 'freedel', value: 0, min: 149, active: true }
];

const REVIEW_TEXT = ['Absolutely loved it, will order again!', 'Delivered hot and on time. Great taste.', 'Good portion size and value for money.', 'Tasty food but delivery was a little late.', 'Packaging was neat and food was fresh.', 'Best in the city, highly recommended.', 'Flavours were authentic. Five stars!', 'Decent food, could use a bit more spice.'];
const RIDERS = [['Ramesh Kumar', 'UP70 AB 1234'], ['Sanjay Yadav', 'UP70 CD 5521'], ['Imran Khan', 'UP70 EF 9087'], ['Deepak Singh', 'UP70 GH 3345'], ['Mohit Verma', 'UP70 JK 7712']];

function build() {
  const rand = rng(2026);
  const db = { meta: { orderSeq: 1000 }, users: [], restaurants: [], menu: [], orders: [], reviews: [], coupons: COUPONS, };
  const mk = (name, email, pw, role, phone, points) => {
    const p = hashPassword(pw);
    const u = { id: 'u' + (db.users.length + 1), name, email, phone, role, salt: p.salt, hash: p.hash, addresses: [], favorites: [], points, createdAt: Date.now() - 30 * 864e5 };
    db.users.push(u); return u;
  };
  const admin = mk('Admin', 'admin@foodiego.com', 'admin123', 'admin', '9000000000', 0);
  const demo = mk('Demo User', 'demo@foodiego.com', 'demo123', 'customer', '9876543210', 120);
  demo.addresses.push({ id: 'a1', label: 'Home', line: '12, Tagore Town', city: 'Prayagraj', pin: '211002' }, { id: 'a2', label: 'Work', line: 'MNNIT Campus, Teliarganj', city: 'Prayagraj', pin: '211004' });
  const names = ['Aarav Sharma', 'Priya Singh', 'Rohan Gupta', 'Sneha Verma', 'Vikram Yadav', 'Ananya Mishra'];
  names.forEach((n, i) => { const u = mk(n, n.split(' ')[0].toLowerCase() + '@example.com', 'pass123', 'customer', '98' + String(70000000 + i * 1111111), Math.floor(rand() * 200)); u.addresses.push({ id: 'a1', label: 'Home', line: (10 + i * 7) + ', Sample Colony', city: 'Prayagraj', pin: '2110' + (10 + i) }); });

  R.forEach((r, i) => {
    const id = 'r' + (i + 1);
    db.restaurants.push({ id, name: r.name, cuisines: r.cuisines, emoji: r.emoji, hue: r.hue, rating: r.rating, ratingCount: r.count, deliveryMins: r.mins, costForTwo: r.cost, pureVeg: r.veg, open: r.open !== false, offer: r.offer, address: r.addr, createdAt: Date.now() - 60 * 864e5 });
    r.menu.forEach((m, j) => db.menu.push({ id: id + 'm' + (j + 1), restaurantId: id, category: m[0], name: m[1], price: m[2], veg: m[3], emoji: m[4], desc: m[5], popular: !!m[6], available: true }));
  });

  const customers = db.users.filter(u => u.role === 'customer');
  const rate = () => Math.max(3, Math.min(5, Math.round(3.3 + rand() * 2)));
  // historical orders over the last 14 days
  for (let n = 0; n < 90; n++) {
    const user = n < 5 ? demo : customers[Math.floor(rand() * customers.length)];
    const rest = db.restaurants.filter(x => x.open)[Math.floor(rand() * 11)];
    const items = db.menu.filter(m => m.restaurantId === rest.id);
    const lines = [];
    const k = 1 + Math.floor(rand() * 3);
    for (let q = 0; q < k; q++) { const m = items[Math.floor(rand() * items.length)]; if (!lines.find(l => l.menuId === m.id)) lines.push({ menuId: m.id, name: m.name, price: m.price, qty: 1 + Math.floor(rand() * 2), veg: m.veg, emoji: m.emoji }); }
    const coupon = rand() < 0.3 ? COUPONS[Math.floor(rand() * COUPONS.length)] : null;
    const p = price({ lines, coupon, tip: rand() < 0.4 ? 20 : 0 });
    const createdAt = Date.now() - Math.floor(rand() * 14 * 864e5) - 36e5 * 2;
    const rider = RIDERS[Math.floor(rand() * RIDERS.length)];
    const cancelled = rand() < 0.06;
    db.meta.orderSeq++;
    db.orders.push({ id: 'FG' + db.meta.orderSeq, userId: user.id, userName: user.name, restaurantId: rest.id, restaurantName: rest.name, restaurantEmoji: rest.emoji, items: lines, pricing: { ...p, couponError: undefined }, coupon: p.couponError ? null : (coupon && coupon.code), address: user.addresses[0], payment: ['COD', 'UPI', 'CARD', 'WALLET'][Math.floor(rand() * 4)], instructions: '', createdAt, manualStatus: cancelled ? 'Cancelled' : 'Delivered', history: [{ status: 'Placed', at: createdAt }], rider: { name: rider[0], vehicle: rider[1], phone: '98000' + (10000 + Math.floor(rand() * 89999)) }, rated: false });
  }
  db.orders.sort((a, b) => a.createdAt - b.createdAt);
  // reviews
  db.restaurants.forEach(r => { for (let k = 0; k < 3; k++) { const u = customers[Math.floor(rand() * customers.length)]; db.reviews.push({ id: 'v' + (db.reviews.length + 1), restaurantId: r.id, userId: u.id, userName: u.name, rating: rate(), text: REVIEW_TEXT[Math.floor(rand() * REVIEW_TEXT.length)], createdAt: Date.now() - Math.floor(rand() * 20 * 864e5) }); } });
  demo.favorites = ['r1', 'r6', 'r8'];
  return db;
}

module.exports = { build, hashPassword };
if (require.main === module) {
  const f = path.join(__dirname, 'db.json');
  if (fs.existsSync(f) && !process.argv.includes('--reset')) console.log('db.json exists (use --reset to regenerate)');
  else { fs.writeFileSync(f, JSON.stringify(build(), null, 2)); console.log('Seed data written to data/db.json'); }
}
