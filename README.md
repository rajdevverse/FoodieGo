# 🍔 FoodieGo — Food Delivery Services (Mini Project)

A complete, full-stack **online food ordering & delivery** web application.
B.Tech CSE (3rd Year) Mini Project-IV — Bharat Ratna Babasaheb Bhimrao Ambedkar Rajkiya Engineering College, Pratapgarh.

- **Frontend:** HTML5, CSS3 (custom design system, dark mode, responsive), Vanilla JavaScript (SPA with hash router)
- **Backend:** Node.js REST API (zero dependencies — uses only built-in `http`, `fs`, `crypto`)
- **Database:** JSON file store (`data/db.json`) auto-generated with dummy data

## ▶️ How to run (VS Code)

1. Install **Node.js 16+** from https://nodejs.org (check with `node -v`).
2. Unzip the project and open the **foodiego** folder in **VS Code** (`File → Open Folder`).
3. Open the terminal (`Ctrl + ~`) and run:

   ```bash
   npm start
   ```
   (or `node server.js`) — **no `npm install` needed.**
4. Open **http://localhost:3000** in your browser.

> Different port: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT=4000; npm start`)
> Reset all data to the original dummy data: `npm run reset` then `npm start`.

## 🔑 Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | demo@foodiego.com | demo123 |
| Admin | admin@foodiego.com | admin123 |
| Other customers | aarav@example.com (priya@, rohan@, sneha@ ...) | pass123 |

The login window also has one-click **Demo customer** / **Admin panel** buttons.

## ✨ Features

**Customer**
- Browse 12 restaurants & 100+ dishes · live search with suggestions (restaurants + dishes)
- Filters: cuisine, pure-veg, rating 4+, fast delivery, offers · sort by rating / time / cost
- Restaurant page: categorised menu, in-menu search, veg-only toggle, bestsellers, reviews & ratings
- Smart cart (drawer): quantity steppers, cooking instructions, one-restaurant rule, persists after refresh
- Coupons (`WELCOME50`, `TASTY30`, `FLAT75`, `FREEDEL`) with server-side validation
- Billing engine: GST 5%, delivery fee (free above ₹499), platform fee, tips, **FoodPoints** redemption
- Checkout: saved addresses, UPI / Card / Wallet / Cash-on-delivery (simulated, validated)
- **Live order tracking**: 5-stage timeline, animated rider on map, ETA countdown, status toasts, confetti
- Order history, reorder in one click, cancel (before preparation), printable invoice, rate delivered orders
- Favourites ❤️, profile & address book, loyalty points, dark / light theme, mobile bottom navigation

**Admin panel** (`/#/admin`)
- Dashboard: revenue, orders, active deliveries, AOV, 7-day revenue chart, order-status donut, top restaurants / dishes, payment split (auto-refresh)
- Orders: search, filter, update status (drives the customer's live tracker)
- Restaurants: add / edit / delete / open-close · Menu manager: add / edit / delete, stock & bestseller toggles
- Coupons: create / activate / delete · Users list

**Security / engineering**
- Passwords hashed with **scrypt + salt**; signed (HMAC-SHA256) expiring tokens
- Role-based access (customer / admin), server-side price calculation (client can't tamper)
- Input sanitisation, output escaping (XSS-safe), path-traversal-safe static server, payload size limit

## 🗂️ Project structure

```
foodiego/
├── server.js            # REST API + static server
├── package.json
├── lib/pricing.js       # shared billing / coupon engine
├── data/
│   ├── seed.js          # dummy-data generator  (creates db.json on first run)
│   └── db.json          # JSON database (auto-created)
└── public/
    ├── index.html
    ├── css/style.css    # design system
    └── js/ util.js · app.js (core, cart, auth, router) · customer.js · admin.js
```

## 🌐 Main API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/register · /login | create account / sign in |
| GET | /api/restaurants?cuisine=&veg=&sort= | list & filter restaurants |
| GET | /api/restaurants/:id | restaurant + menu + reviews |
| GET | /api/search?q= | dishes & restaurants search |
| POST | /api/quote | price a cart (coupon, tip, points) |
| POST | /api/orders | place order |
| GET | /api/orders/:id | order with live status & timeline |
| POST | /api/orders/:id/cancel · /rate | cancel / rate |
| * | /api/admin/... | stats, orders, restaurants, menu, coupons, users |

## ⏱️ Delivery simulation speed
By default an order completes in ~3 minutes (demo speed). For a realistic 30-minute flow: `TIME_SCALE=10 npm start`.
