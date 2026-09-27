# StreamCart — Architecture Notes & Trade-offs

StreamCart is a multi-vendor marketplace where shopping happens inside short videos (reels) and live broadcasts. This document explains how the **frontend** is built, how it maps onto the planned **Supabase** backend, and the trade-offs made along the way.

---

## 1. Goals that shaped the design

| Goal | Consequence |
|---|---|
| Plain HTML / CSS / JS (brief requirement) | No framework, no bundler. Native ES modules + one CSS design system. |
| "Buy without leaving the video" | A shared in-drawer checkout (`components/quickBuy.js`) used by reels and live. |
| Supabase-only backend | Every data call goes through a thin `services/` layer shaped like Supabase queries, so the mock can be swapped for the real client. |
| Three roles (Admin, Vendor, Customer) | Role-guarded dashboards (`mountDashboard` → `requireRole`) mirroring what RLS will enforce server-side. |
| Demo-able without a backend | Seed data + localStorage persistence + BroadcastChannel "realtime". |

---

## 2. Frontend structure

```
index.html                 Home (storefront)
pages/shop|reels|live|auth|account/*.html   Customer-facing pages
vendor/*.html              Vendor dashboard (13 pages)
admin/*.html               Admin dashboard (12 pages)
assets/
  css/   base → layout → components → dashboard → pages/*   (imported by main.css)
  js/
    core/        config, routes, auth (session + role guard), store (localStorage), utils
    data/        seed rows — one file per future Postgres table
    services/    db, catalog, cart, orders, reels, live, vendors, userdata, ai, analytics, realtime
    components/  header, footer, shell, dashboardLayout, modal, toast, cards, charts, quickBuy, chatWidget, forms
    pages/       one entry module per HTML page (same path as the HTML file)
docs/ARCHITECTURE.md
```

**Page pattern.** Every HTML file is a thin shell (`<div id="app">` + one `<script type="module">`). The page module mounts a layout (`mountShell` for storefront, `mountDashboard` for vendor/admin) and renders into it. `data-root` on `<body>` lets the same modules work at any folder depth.

**Rendering.** Template literals + `innerHTML`, all user-provided strings passed through `escapeHtml`. Event handlers are re-bound after each render. Icons are Lucide (`<i data-lucide>`), auto-hydrated by a `MutationObserver`.

**Why a multi-page app, not an SPA?** Each page is independently linkable/SEO-friendly, there is no client router to maintain, and a failure on one page cannot break the others. The cost is a full page load on navigation (mitigated by small modules and HTTP caching).

---

## 3. Mock backend → Supabase mapping

`services/db.js` exposes `all / get / where / insert / update / remove`, each table seeded from `assets/js/data/` and persisted to `localStorage` (`sc_db_<table>`). `respond()` adds latency and returns a clone so pages are written as if they were awaiting a network call.

To go live: set `USE_MOCK=false`, add `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `core/config.js`, and replace the helpers inside each service with `supabase.from(table)` calls. **Page code does not change** — it only talks to services.

### 3.1 Tables (Postgres)

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | id (= auth.users.id), name, role (`admin`/`vendor`/`customer`), phone, status | Created by trigger on sign-up |
| `vendors` | id, owner_id → profiles, name, slug, status (`pending`/`approved`/`suspended`/`rejected`), commission_rate, balance, verified | |
| `categories` | id, name, parent_id → categories, icon | Self-referencing tree (multi-level) |
| `products` | id, vendor_id, category_id, title, price, original_price, stock, status, images[], tags[] | Full-text index on title/brand/tags |
| `reels` | id, vendor_id, video_path, poster_path, caption, status (`pending`/`approved`/`rejected`/`flagged`), counters | |
| `reel_products` | reel_id, product_id | Product tagging (many-to-many) |
| `reel_likes`, `reel_saves`, `reel_comments` | user_id, reel_id, … | Counters maintained by triggers |
| `live_streams` | id, vendor_id, title, status (`scheduled`/`live`/`ended`), pinned_product_id, scheduled_at, started_at, peak_viewers | |
| `stream_products` | stream_id, product_id | |
| `carts`, `wishlists` | user_id, product_id, qty | |
| `orders` | id, customer_id, total, status, payment_status, payment_method, **source** (`store`/`reel`/`live`), source_ref_id, address jsonb | `source` powers channel attribution analytics |
| `order_items` | order_id, product_id, vendor_id, price, qty, status | Split per vendor for fulfilment |
| `payouts`, `disputes`, `conversations`, `messages`, `follows`, `user_events` | | `user_events` feeds recommendations |

### 3.2 Row Level Security (summary)

- **Customers**: read approved vendors / active products / approved reels; read & write only their own cart, wishlist, orders, likes, comments.
- **Vendors**: full CRUD on rows where `vendor_id = my_vendor_id()`; read `order_items` for their products only; cannot change `commission_rate`, `status` or `verified`.
- **Admins**: `is_admin()` helper grants all; moderation/status columns are writable **only** by admins (column-level policy or RPC).
- Money-moving writes (placing orders, payouts, refunds) happen in **Edge Functions** with the service role, never directly from the browser.

### 3.3 Storage buckets

| Bucket | Access |
|---|---|
| `product-images` | public read; write restricted to the owning vendor's folder (`vendor_id/…`) |
| `reels` | public read for approved reels; vendor-scoped write; a transcode/thumbnail job produces the poster |
| `avatars` | public read; user-scoped write |

### 3.4 Realtime

`services/realtime.js` mimics Supabase Realtime with `BroadcastChannel` (open two tabs to see it work):

| Channel | Events | Supabase equivalent |
|---|---|---|
| `orders` | `order:new`, `order:update` | Postgres changes on `orders` / `order_items` (filtered by RLS) |
| `stream:<id>` | `chat`, `reaction`, `pin`, `status` | Broadcast channel per stream (chat/reactions are ephemeral; only pin/status persisted) |

Presence (viewer count) would use Supabase Realtime **Presence** on `stream:<id>`.

### 3.5 Edge Functions

| Function | Purpose |
|---|---|
| `checkout` | Validate cart & stock, create order + items, create payment intent (Stripe / SSLCommerz / bKash) |
| `payment-webhook` | Mark order paid, decrement stock, credit vendor balance minus commission |
| `live-token` | Mint an Agora/LiveKit token (publisher for the owning vendor, subscriber for viewers) |
| `moderate-reel` | Run AI safety checks on upload; set `pending` or `flagged` |
| `recommend`, `search`, `auto-tag`, `support-chat` | AI features (see §5) |
| `payout-process`, `dispute-resolve` | Admin money operations |

---

## 4. Live streaming (Agora / LiveKit)

- **Video transport** is delegated to Agora or LiveKit (`CONFIG.LIVE_PROVIDER`). The vendor "Go live studio" already captures the camera with `getUserMedia`; in production that `MediaStream` is published via the provider SDK after fetching a token from `live-token`.
- **Commerce layer stays in Supabase**: stream metadata, pinned product, chat, reactions and orders go over Supabase Realtime, so the video provider can be swapped without touching shopping logic.
- In the demo, viewers see a sample MP4 and an audience simulator (`simulateAudience`) generates chat, reactions and viewer counts. Vendor actions (pin, host chat) reach viewer tabs in real time.

---

## 5. AI features (mocked client-side in `services/ai.js`)

| Feature | Demo implementation | Production plan |
|---|---|---|
| Recommendations | Weighted user events (view, cart, purchase, like) → category/vendor affinity scoring | `user_events` + pgvector embeddings, `recommend` Edge Function |
| Reel ranking | Affinity + engagement + recency | Same signals, computed server-side |
| Smart search | Intent parsing (price limits, "under 5000", synonyms, typo correction) over products/reels/streams | Postgres FTS + embeddings via `search` function |
| Auto-tagging | Caption/file-name keyword matching against the vendor's catalog with confidence scores | Vision model on the uploaded frames |
| Support chat | Rule-based intents (order status, shipping, returns, payment, product finder) | LLM with tool calls to order/product APIs |
| Moderation | Risky-word + missing-tag heuristics → "AI safety score" | Vision + text moderation in `moderate-reel` |

---

## 6. Key trade-offs

1. **No framework / no build step.** Matches the brief and keeps onboarding trivial, at the cost of manual DOM updates and no type checking. Mitigated with small single-purpose modules and a strict page/service/component split.
2. **Mock data layer instead of a live Supabase project.** Lets the whole UX be reviewed with zero setup; the price is that security (RLS) is *simulated* by the role guard — the client guard is UX only and must be backed by RLS.
3. **`innerHTML` templating.** Fast to write and read; every dynamic string is escaped. A virtual DOM would be safer against mistakes but adds a dependency.
4. **Multi-page app.** Simple and robust; loses cross-page state (solved with localStorage + storage events for cart/wishlist badges).
5. **Reels as plain `<video>` + IntersectionObserver.** Only the visible reel plays; others are paused. Production should serve HLS renditions for adaptive bitrate.
6. **CDN libraries (Lucide, Chart.js).** No install step; requires internet. Can be vendored locally for offline use.
7. **Orders store a `source` field.** Tiny cost, but it unlocks the key business metric — how much revenue reels and live streams drive.

---

## 7. What's intentionally out of scope (frontend-only phase)

Real authentication, payments, video transport, email/SMS notifications and server-side AI. Each has a clearly marked seam: `core/auth.js`, `services/orders.js#placeOrder`, `pages/vendor/go-live.js#startCamera`, `services/ai.js`.
