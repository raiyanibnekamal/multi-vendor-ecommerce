# StreamCart — Architecture Notes & Trade-offs

StreamCart is a multi-vendor marketplace where shopping happens inside short videos (reels) and live broadcasts. This document describes the current vanilla-JavaScript frontend, its Supabase/Vercel integration, and the production capabilities that remain unfinished.

---

## 1. Goals that shaped the design

| Goal | Consequence |
|---|---|
| Plain HTML / CSS / JS (brief requirement) | No framework, no bundler. Native ES modules + one CSS design system. |
| "Buy without leaving the video" | A shared in-drawer checkout (`components/quickBuy.js`) used by reels and live. |
| Usable with or without hosted services | The service layer supports Supabase-backed data plus local seeded/demo state and browser persistence. |
| Three roles (Admin, Vendor, Customer) | Role-guarded dashboards (`mountDashboard` → `requireRole`) mirroring what RLS will enforce server-side. |
| Demo-able without hosted services | Seed data + localStorage persistence + BroadcastChannel fallback. |

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
    core/        config, routes, auth (Supabase bridge + demo session), store, utils, PWA
    data/        seed rows — one file per future Postgres table
    services/    db, catalog, cart, orders, reels, live, vendors, userdata, AI, analytics, realtime, storage
    components/  header, footer, shell, dashboardLayout, modal, toast, cards, charts, quickBuy, chatWidget, forms
    pages/       one entry module per HTML page (same path as the HTML file)
  api/ai.js                  Vercel serverless proxy for Groq requests
  sw.js                      PWA service worker
docs/ARCHITECTURE.md
```

**Page pattern.** Every HTML file is a thin shell (`<div id="app">` + one `<script type="module">`). The page module mounts a layout (`mountShell` for storefront, `mountDashboard` for vendor/admin) and renders into it. `data-root` on `<body>` lets the same modules work at any folder depth.

**Rendering.** Template literals + `innerHTML`; views use `escapeHtml` for dynamic display strings, but escaping must be checked at each rendering boundary. Event handlers are re-bound after each render. Icons are Lucide (`<i data-lucide>`), auto-hydrated by a `MutationObserver`.

**Why a multi-page app, not an SPA?** Each page is independently linkable/SEO-friendly, there is no client router to maintain, and a failure on one page cannot break the others. The cost is a full page load on navigation (mitigated by small modules and HTTP caching).

---

## 3. Data and service architecture

`services/db.js` exposes `all / get / where / insert / update / remove`. It initializes from seed data/localStorage and asynchronously hydrates configured tables from Supabase. Supabase Auth is used for non-demo accounts; seeded demo accounts remain local. Orders are written remotely only for a matching authenticated Supabase UUID. Checkout awaits separate order-header and order-item writes, then updates product stock separately; it does not call the SQL `place_order_atomic` RPC, so the full operation is not atomic. If remote reads fail, local/demo data remains available.

The current Supabase project URL and anon/publishable key are configured in `assets/js/core/config.js`. Never put a Supabase service-role key or Groq API key in browser code. Live order reads require the RLS recursion fix in `supabase/migrations/07_rls_recursion_fix.sql`; apply that migration to existing databases before relying on the orders workflow.

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

### 3.2 Row Level Security (implemented intent)

- **Customers**: read approved vendors / active products / approved reels; read & write only their own cart, wishlist, orders, likes, comments.
- **Vendors**: product/order access is scoped by vendor ID. The current vendor-row UPDATE policy checks ownership but does not enforce column-level restrictions for `commission_rate`, `status` or `verified`; harden this before treating those fields as protected.
- **Admins**: `is_admin()` helper grants all; moderation/status columns are writable **only** by admins (column-level policy or RPC).
- Order INSERT policies are restricted to authenticated customers and customer-owned orders/items. Guest checkout is intentionally unsupported.
- Client role guards are UX only; RLS is the enforcement boundary. The deployed database's migration state must be verified separately. Payment capture, payouts, and refunds still need trusted server-side workflows before production use.

### 3.3 Storage buckets

| Bucket | Access |
|---|---|
| `product-images` | public read; write restricted to the owning vendor's folder (`vendor_id/…`) |
| `reels` | Public-read bucket with vendor-scoped write policies in SQL; no server-side transcode job is implemented. |
| `avatars` | public read; user-scoped write |

### 3.4 Realtime

`services/realtime.js` uses Supabase Postgres Changes where configured and `BroadcastChannel` as a same-browser fallback:

| Channel | Events | Supabase equivalent |
|---|---|---|
| `orders` | `order:new`, `order:update` | Postgres changes on `orders` / `order_items` (filtered by RLS) |
| `stream:<id>` | `chat`, `reaction`, `pin`, `status` | Broadcast channel per stream (chat/reactions are ephemeral; only pin/status persisted) |

Presence (viewer count) is currently simulated/local; production viewer presence should use Supabase Realtime **Presence** on `stream:<id>`.

### 3.5 Edge Functions

| Function | Status and purpose |
|---|---|
| `api/ai.js` | Implemented Vercel function; validates allowlisted AI actions and calls Groq using server-only `GROQ_API_KEY`. |
| `place_order_atomic` (`05_rpc.sql`) | Defined in SQL but not called by the current frontend checkout. The UI writes order header/items separately and adjusts stock separately. |
| `checkout`, `payment-webhook` | No payment-provider integration is present. The current frontend marks non-COD orders paid without provider confirmation; this is demo behavior, not a valid payment signal. |
| `live-token` | Planned. Live video transport is currently sample media/demo simulation. |
| `moderate-reel` | Groq review is available on demand as decision support; human moderation remains authoritative. |
| `payout-process`, `dispute-resolve` | Planned trusted server-side money operations. |

---

## 4. Live streaming (Agora / LiveKit)

- **Video transport** is delegated to Agora or LiveKit (`CONFIG.LIVE_PROVIDER`). The vendor "Go live studio" already captures the camera with `getUserMedia`; in production that `MediaStream` is published via the provider SDK after fetching a token from `live-token`.
- **Commerce layer stays in Supabase**: stream metadata, pinned product, chat, reactions and orders go over Supabase Realtime, so the video provider can be swapped without touching shopping logic.
- In the demo, viewers see a sample MP4 and an audience simulator (`simulateAudience`) generates chat, reactions and viewer counts. Vendor actions (pin, host chat) reach viewer tabs in real time.

---

## 5. AI features (Groq + local fallback)

| Feature | Current implementation |
|---|---|---|
| Recommendations | Local category/vendor affinity, optionally reranked by Groq using supplied candidate products. |
| Reel ranking | Local affinity/engagement/recency, optionally reranked by Groq using supplied reel summaries. |
| Smart search | Local intent parsing, synonyms, price filters, typo correction; Groq optionally reranks the matching local candidate set. |
| Auto-tagging | Groq selects from the current vendor's catalog; local caption/file-name scoring is fallback. |
| Product content | Groq can draft factual product descriptions and discovery tags; local safe fallback remains. |
| Support chat | Local account/order/policy intents first; Groq handles general questions without access to private order tools. |
| Moderation | Local heuristics plus optional on-demand Groq decision support; it does not automatically approve/reject reels. |

The browser calls only the same-origin `/api/ai` endpoint. When configured, `GROQ_API_KEY` is read from the Vercel server environment and is never sent to the client. Deployment environment values are not verifiable from this repository. Without the key/function, the app falls back to local behavior.

---

## 6. Key trade-offs

1. **No framework / no build step.** Matches the brief and keeps onboarding trivial, at the cost of manual DOM updates and no type checking. Mitigated with small single-purpose modules and a strict page/service/component split.
2. **Hybrid local and Supabase data.** Lets the UI remain demo-able when a hosted service is unavailable; the trade-off is local fallback data is not cross-device state, and client role guards are UX only.
3. **`innerHTML` templating.** Fast to write and read; every dynamic string is escaped. A virtual DOM would be safer against mistakes but adds a dependency.
4. **Multi-page app.** Simple and robust; loses cross-page state (solved with localStorage + storage events for cart/wishlist badges).
5. **Reels as plain `<video>` + IntersectionObserver.** Only the visible reel plays; others are paused. Production should serve HLS renditions for adaptive bitrate.
6. **CDN libraries (Lucide, Chart.js).** No install step; requires internet. Can be vendored locally for offline use.
7. **Orders store a `source` field.** Tiny cost, but it unlocks the key business metric — how much revenue reels and live streams drive.

---

---

## 7. Backend readiness and deployment notes

The following diagrams and tables describe the intended backend boundary, not a claim that every production workflow is deployed. The frontend is deployed at [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/). Existing Supabase projects must apply migrations in order, including `06_auth_order_hardening.sql` and `07_rls_recursion_fix.sql`; live orders previously returned PostgreSQL `42P17` until the RLS recursion fix is applied. No database migration is run automatically by the frontend deployment.

### 7.1 Architecture & Component Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Vercel)                           │
│  Storefront  │  Reels  │  Live Studio  │  Vendor Dash  │  Admin Dash   │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
              @supabase/supabase-js (Browser SDK)
                            │
┌───────────────────────────▼────────────────────────────────────────────┐
│                    Supabase Backend (Free Tier)                         │
├───────────────────────────┬────────────────────────────────────────────┤
│ 1. Supabase Auth          │ Email/password + Role metadata             │
│                           │ Trigger creates public.profiles automatically│
├───────────────────────────┼────────────────────────────────────────────┤
│ 2. PostgreSQL (v15+)      │ 20+ Normalized relational tables           │
│                           │ Check constraints & Foreign key cascades   │
├───────────────────────────┼────────────────────────────────────────────┤
│ 3. Row Level Security     │ Role/vendor policies defined in migrations │
│                           │ Verify deployed policy state before launch  │
├───────────────────────────┼────────────────────────────────────────────┤
│ 4. Stored Procedures(RPC) │ SQL RPCs defined; checkout not wired to RPC │
│                           │ Vendor Balance & Payout calculation        │
│                           │ Live Stream Product Pinning & Metrics      │
├───────────────────────────┼────────────────────────────────────────────┤
│ 5. Supabase Realtime      │ Broadcast: Live chat, reactions, pin card  │
│                           │ Postgres Changes: Orders & Vendor alerts   │
├───────────────────────────┼────────────────────────────────────────────┤
│ 6. Supabase Storage       │ Buckets: product-images, reels, avatars    │
│                           │ Public read + Vendor-authenticated write   │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Core Database Entities (20+ Tables)

1. **`profiles`** - User accounts extending `auth.users` (role: `admin`, `vendor`, `customer`).
2. **`vendors`** - Vendor stores, slug, commission rate, balance, rating, verification status.
3. **`categories`** - Multi-level category hierarchy (`parent_id`).
4. **`products`** - Products catalog with pricing, stock, category, tags, and rating.
5. **`product_images`** - Multi-image gallery per product with display order.
6. **`reels`** - Video feed posts with video/poster URLs, status, view/like counters.
7. **`reel_products`** - Many-to-many product tagging in reels for instant in-video purchase.
8. **`reel_likes`**, **`reel_comments`**, **`reel_saves`** - Engagement tracking with auto-trigger counters.
9. **`live_streams`** - Scheduled and active live selling broadcasts with viewer tracking.
10. **`stream_products`** - Products featured in a live stream.
11. **`stream_messages`** - Realtime and persisted live stream chat history.
12. **`carts`** & **`wishlists`** - Customer cart items & saved products.
13. **`orders`** - Main order headers with payment status, delivery address, subtotal, discount, source (`store`, `reel`, `live`).
14. **`order_items`** - Items split by vendor for isolated fulfillment and commission tracking.
15. **`payouts`** - Vendor withdrawal requests and admin approval workflow.
16. **`disputes`** - Customer complaints, status tracking, and admin resolution.
17. **`conversations`** & **`messages`** - Vendor-customer direct messaging.
18. **`follows`** - Customer following vendors for stream & reel notifications.
19. **`user_events`** - Event log for AI recommendation and analytics.
20. **`reviews`** - Product ratings and verified purchase reviews.

### 7.3 Security (RLS) Matrix

| Table | Anonymous / Public | Customer | Vendor | Admin |
|---|---|---|---|---|
| `profiles` | Read vendor profile info | Read/Update own profile | Read/Update own profile | Full CRUD |
| `vendors` | Read approved vendors | Read approved vendors | Update own store details | Full CRUD |
| `categories` | Read all | Read all | Read all | Full CRUD |
| `products` | Read active products | Read active products | Full CRUD on own products | Full CRUD |
| `reels` | Read approved reels | Read approved + Like/Comment | Full CRUD on own reels | Moderate / Delete |
| `live_streams` | Read live/scheduled | Read + Chat in stream | Full CRUD on own streams | Full CRUD |
| `carts` / `wishlists` | None | Own rows only | Own rows only | Full CRUD |
| `orders` | None | Read own; insert own authenticated order | Read orders containing own items | Full CRUD |
| `order_items` | None | Read items in own orders | Read & update own items only | Full CRUD |
| `payouts` | None | None | Create & view own payouts | Approve / Reject / Pay |

This matrix summarizes intended access, not a live database attestation. In the current SQL, vendor updates are ownership-scoped but not restricted by column; verify and harden sensitive vendor fields before production.

### 7.4 Implementation Roadmap

- [x] **Phase 1: Architecture & Design Alignment** (this document)
- [x] **Phase 2: Database Schema & DDL Scripts** (`supabase/migrations/01_schema.sql`)
- [x] **Phase 3: Security & Row Level Security (RLS)** (`supabase/migrations/02_rls.sql`)
- [x] **Phase 4: Storage Buckets & Policies** (`supabase/migrations/03_storage.sql`)
- [x] **Phase 5: Realtime Replication Setup** (`supabase/migrations/04_realtime.sql`)
- [x] **Phase 6: Stored Procedures & Business Logic (RPC)** (`supabase/migrations/05_rpc.sql`)
- [x] **Phase 7: Comprehensive Demo Seed Data** (`supabase/seed.sql`)
- [x] **Phase 8: Frontend Client Integration** (`assets/js/core/supabase.js` & service bridge)
- [x] **Phase 9: Supabase Auth, Storage, Realtime and Groq AI proxy integration** (source implemented; production env/migrations still require deployment configuration)

