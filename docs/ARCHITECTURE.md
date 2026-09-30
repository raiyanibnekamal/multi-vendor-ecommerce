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
    core/        config, routes, auth (Supabase bridge + Firebase Google OAuth + demo session), firebase, store, utils, PWA
    data/        seed rows — one file per future Postgres table
    services/    db, catalog, cart, orders, reels, live/Agora, vendors, userdata, AI, analytics, realtime, storage
    components/  header, footer, shell, dashboardLayout, modal, toast, cards, charts, quickBuy, chatWidget, forms
    pages/       one entry module per HTML page (same path as the HTML file)
  sw.js                      PWA service worker
api/ai.js                    Vercel serverless proxy for Groq requests
api/agora-token.js           Vercel/local serverless token issuer
api/firebase-config.js       Vercel/local serverless public Firebase config provider
docs/ARCHITECTURE.md
```

**Page pattern.** Every HTML file is a thin shell (`<div id="app">` + one `<script type="module">`). The page module mounts a layout (`mountShell` for storefront, `mountDashboard` for vendor/admin) and renders into it. `data-root` on `<body>` lets the same modules work at any folder depth.

**Rendering.** Template literals + `innerHTML`; views use `escapeHtml` for dynamic display strings, but escaping must be checked at each rendering boundary. Event handlers are re-bound after each render. Icons are Lucide (`<i data-lucide>`), auto-hydrated by a `MutationObserver`.

**Why a multi-page app, not an SPA?** Each page is independently linkable/SEO-friendly, there is no client router to maintain, and a failure on one page cannot break the others. The cost is a full page load on navigation (mitigated by small modules and HTTP caching).

---

## 3. Data and service architecture

`services/db.js` exposes local reads plus synchronized writes. It initializes from seed data/localStorage and hydrates configured tables from Supabase for real sessions. Local demo sessions deliberately skip Supabase hydration and keep demo CRUD in browser storage so demo data is not overwritten by anonymous remote reads. Supabase Auth is used for real accounts; demo IDs are stable local identities. With migrations 01-11 applied, live COD checkout requires the matching authenticated Supabase UUID and calls `place_order_atomic`; the database derives prices, totals, and stock changes in one transaction. Online payment choices are mock-only.

The current Supabase project URL and anon/publishable key are configured in `assets/js/core/config.js`. Never put a Supabase service-role key or Groq API key in browser code. Apply migrations through `11_order_payments_notifications.sql` to existing databases before relying on live registration, order, notification, follow, storage, dispute, payout, or stream-message workflows.

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
- **Vendors**: product/order access is scoped by vendor ID. Migration 08 adds a trigger that prevents vendor owners changing ownership, approval, verification, rating, follower, commission, or balance fields; store-profile fields remain editable.
- **Admins**: `is_admin()` helper grants all; migration 08 routes order and dispute resolution through admin-checked RPCs.
- Direct customer INSERT policies for orders/items are removed by migration 08. Authenticated checkout uses the server-priced `place_order_atomic` RPC; guest checkout is unsupported.
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
| `place_order_atomic` (`05_rpc.sql`, hardened by migration 08) | Called by live checkout after migration 08; prices, coupons, shipping, stock locks, order rows, and items are handled in one transaction. |
| `handle_new_user` (migration 08) | Creates the profile and pending vendor store inside the auth trigger, so email-confirmation signup does not lose the store record. |
| `checkout`, `payment-webhook` | No payment-provider integration is present. Live checkout permits COD only; online methods are rejected until a provider confirms payment server-side. |
| `/api/agora-token` | Implemented Vercel/local Node endpoint. Verifies real Supabase publisher sessions and approved vendor ownership, then issues short-lived Agora RTC tokens. Local demo publishing is opt-in and refused in production. |
| `/api/firebase-config` | Implemented Vercel/local Node endpoint. Securely delivers public Firebase Web credentials (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc.) from environment variables to client Google OAuth. |
| `moderate-reel` | Groq review is available on demand as decision support; human moderation remains authoritative. |
| `request_vendor_payout`, `admin_update_payout_status` (migration 08) | Authenticated RPCs reserve and restore vendor balances transactionally; actual bank/wallet transfer remains a manual external operation. |
| `admin_resolve_dispute` (migration 08) | Admin-only case/status resolution; refund approval is recorded, but issuing money remains an external/manual operation. |

---

## 4. Live streaming (Agora RTC)

- **Video transport:** Agora Web SDK is loaded by `assets/js/services/agora.js`. The vendor studio publishes camera/microphone media; the viewer subscribes to the broadcaster. `/api/agora-token` issues 10-minute tokens. Broadcasters require a valid Supabase session, approved vendor ownership, and a live/scheduled stream; viewer tokens have join-only privileges.
- **Local demo:** `AGORA_ALLOW_DEMO_PUBLISHER=true` permits only the seeded `v1` demo vendor to publish when not in production. Demo stream state stays in browser storage. Do not enable this flag on Vercel.
- **Commerce/realtime:** stream metadata is stored in Supabase for real accounts; chat messages use the checked RPC, and pin/status events use Supabase Realtime/Broadcast. Same-browser BroadcastChannel is a local fallback.
- **Viewer counts:** realtime presence counting is not implemented. Seed counts/demo metrics are not production concurrent-viewer analytics.
- **Fallback:** if Agora credentials or RTC network access are unavailable, the viewer may display sample/replay media; this is not a live broadcast.

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

The browser calls only the same-origin `/api/ai` endpoint. When configured, `GROQ_API_KEY` is read from the server environment (`dev-server.mjs` / Vercel) and is never sent to the client. The default model is configured as `openai/gpt-oss-120b` (or `qwen/qwen3.8-27b`) with 1,000 max tokens headroom so reasoning output does not truncate valid JSON. Without the key/function, the app falls back to local heuristic behavior.

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

The following diagrams and tables describe the backend boundary, not a claim that every external production workflow is deployed. The frontend is deployed at [multi-vendor-ecommerce-neon.vercel.app](https://multi-vendor-ecommerce-neon.vercel.app/). Existing Supabase projects must apply migrations 01-11 in order; the frontend does not run database migrations automatically.

### 7.1 Architecture & Component Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Vercel)                           │
│  Storefront  │  Reels  │  Live Studio  │  Vendor Dash  │  Admin Dash   │
│  Auth (Login / Register / Firebase Google OAuth / Demo Switcher)       │
└─────────────┬────────────────────────────────────────────┬─────────────┘
              │                                            │
@supabase/supabase-js (Browser SDK)          Firebase Auth SDK & API Proxy
              │                                            │
┌─────────────▼────────────────────────────┐ ┌─────────────▼─────────────┐
│    Supabase Backend (Free Tier)          │ │ Serverless API Endpoints  │
├──────────────────────────┬───────────────┤ ├───────────────────────────┤
│ 1. Supabase Auth         │ Email/password│ │ /api/ai                   │
│                          │ + Profile sync│ │   Groq reasoning proxy    │
├──────────────────────────┼───────────────┤ │ /api/agora-token          │
│ 2. PostgreSQL (v15+)     │ 20+ Tables    │ │   Agora RTC token minter  │
├──────────────────────────┼───────────────┤ │ /api/firebase-config      │
│ 3. Row Level Security    │ Role policies │ │   Public Firebase config  │
├──────────────────────────┼───────────────┤ └───────────────────────────┘
│ 4. Stored Procedures(RPC)│ Atomic flows  │
├──────────────────────────┼───────────────┤
│ 5. Supabase Realtime     │ Broadcast/sync│
├──────────────────────────┼───────────────┤
│ 6. Supabase Storage      │ 3 Buckets     │
└──────────────────────────┴───────────────┘
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
| `orders` | None | Read own; create through atomic RPC | Read orders containing own items | Full CRUD |
| `order_items` | None | Read items in own orders | Read & update own items only | Full CRUD |
| `payouts` | None | None | Create & view own payouts | Approve / Reject / Pay |

This matrix summarizes source and migration intent, not a live database attestation. Confirm migration 08 is applied before enabling live registration, checkout, order, follow, Storage, dispute, or payout workflows.

### 7.4 Security posture

- **Authentication:** Supabase Auth is the production identity boundary. An account without a Supabase session is not treated as authenticated; local sessions are limited to explicit demo/mock mode.
- **Authorization:** RLS and security-definer RPCs enforce customer, vendor, and admin boundaries. Client-side role guards are UX only.
- **Injection:** Application SQL uses Supabase query builders and fixed-parameter RPCs. The only dynamic SQL in migrations uses `format('%I', ...)` for catalog identifiers, never user input.
- **Browser boundary:** Media URLs are restricted to safe schemes and escaped before HTML attribute insertion. Vercel headers add CSP, HSTS, frame protection, MIME protection, referrer policy, and Permissions Policy.
- **Launch dependencies:** Verify migrations 01-11 on the hosted database, configure Supabase Auth email policy, add distributed API rate limiting, and replace the mock-payment wrapper with a trusted payment webhook before handling real money.

### 7.5 Implementation Roadmap

- [x] **Phase 1: Architecture & Design Alignment** (this document)
- [x] **Phase 2: Database Schema & DDL Scripts** (`supabase/migrations/01_schema.sql`)
- [x] **Phase 3: Security & Row Level Security (RLS)** (`supabase/migrations/02_rls.sql`)
- [x] **Phase 4: Storage Buckets & Policies** (`supabase/migrations/03_storage.sql`)
- [x] **Phase 5: Realtime Replication Setup** (`supabase/migrations/04_realtime.sql`)
- [x] **Phase 6: Stored Procedures & Business Logic (RPC)** (`supabase/migrations/05_rpc.sql`)
- [x] **Phase 7: Comprehensive Demo Seed Data** (`supabase/seed.sql`)
- [x] **Phase 8: Frontend Client Integration** (`assets/js/core/supabase.js` & service bridge)
- [x] **Phase 9: Supabase Auth, Storage, Realtime and Groq AI proxy integration** (source implemented; production env/migrations still require deployment configuration)
- [x] **Phase 10: Production security hardening** (`10_production_security_hardening.sql`, safe media URL handling, and deployment security headers; hosted migration state still requires verification)
- [x] **Phase 11: Order payment and notification foundation** (`11_order_payments_notifications.sql`, secure mock payment wrapper, persisted notifications, realtime updates, and downloadable order receipts)
- [x] **Phase 12: Real-time Live Video Streaming** (Agora RTC Web SDK integration `assets/js/services/agora.js`, serverless token issuer `/api/agora-token.js`, vendor broadcaster studio, and subscriber audience room)
- [x] **Phase 13: Firebase Google Authentication & Brand Auth Redesign** (Modular Firebase client integration `assets/js/core/firebase.js`, `/api/firebase-config.js` public config provider, Supabase profile auto-sync, 1-click Google OAuth popup, and modernized glassmorphic login/register UI)
- [x] **Phase 14: Comprehensive E2E Headless Verification & AI Reasoning Headroom** (25/25 automated test steps passing across Storefront, Cart, Catalog, Customer, Vendor, Admin flows with 0 console errors; Groq AI `openai/gpt-oss-120b` configured with 1,000 max tokens headroom for reasoning output)

