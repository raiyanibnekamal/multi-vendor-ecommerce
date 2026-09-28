# StreamCart — Comprehensive Codebase Audit, Gaps & Implementation Roadmap

> **Audit Date:** 2026-09-28
> **Repository:** `raiyanibnekamal/multi-vendor-ecommerce`
> **Status:** Active Maintenance & Bug Fixing
> **Live app:** [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/)

---

## 📊 1. Codebase Overview & Current Status

> **Status snapshot (2026-09-28):** The application is in a stable frontend prototype phase with a fully featured storefront, login flows, vendor/admin dashboards, reels discovery, live shopping, AI-assisted discovery, and a working local/demo data model. The remaining work is primarily production hardening: provider-backed payments, payout transfer execution, and verifying the remote Supabase migration state on the hosted project.

- **Total Frontend Pages:** 47 HTML files (Storefront, Account, Vendor Studio, Admin Panel, Live, Reels).
- **JavaScript Inventory:** 93 source JS files: 91 browser modules under `assets/js`, `api/ai.js`, and `sw.js` — **0 syntax errors** in the source-only parser check.
- **Import and HTML Reference Integrity:** 0 missing relative imports across 91 browser modules and 0 broken local HTML references across 47 project pages.
- **Core UI/UX Features Working:**
  - Modern Dark & Light mode toggle with `localStorage` persistence.
  - Video Commerce: Reels vertical swipe with Quick-Buy modal drawer.
  - Live Shopping: Realtime pinned products, audience reactions & live chat sync across tabs.
  - Vendor Studio: 13 dedicated management pages.
  - Admin Dashboard: 12 comprehensive platform control pages.
  - AI: Local heuristic fallbacks plus optional server-side Groq ranking, chat, tagging, product copy, and moderation review.

---

## 🚨 2. Discovered Problems, Bugs & Gaps

### Priority 1: PWA Service Worker Missing
- **Status: Complete.** Root `sw.js` precaches core assets and uses guarded network-first caching with offline fallback. It skips requests carrying API keys/auth headers, clones cacheable responses safely, and uses cache version `v3` to replace the worker that emitted `Response.bodyUsed` errors. Registration is idempotent and runs from storefront, dashboard, and auth layouts.

---

### Priority 2: Product Image & Reel Uploads Base64 / Storage Disconnect
- **Status: Complete.** Product images and uploaded reel videos use Supabase Storage when available. Offline image fallback is resized/compressed; offline reel Blobs are stored in IndexedDB and referenced from the local database by a stable key, then resolved by the home feed, reels feed, and moderation preview. If browser media storage is unavailable, the UI degrades to the poster rather than a broken media URL.

---

### Priority 3: Supabase RLS & Orders Table Data Type Mismatch
- **Status: Source fixes and migration 08 complete; deployed database state unverified.** Live accounts use the Supabase Auth UUID. Migration 07 resolves order-policy recursion; migration 08 removes direct customer order inserts, protects profile roles/vendor financial fields, and moves checkout, vendor fulfillment/cancellation, and payout mutations behind authenticated RPCs. Signup role comes from the database profile, not client metadata.
- **Existing deployments:** Run migrations through `supabase/migrations/08_backend_security_and_atomic_flows.sql`. The live project was not mutated from this workspace.

---

### Priority 4: Supabase Realtime Listener (Postgres Changes)
- **Status: Complete.** Realtime channels listen to Postgres Changes for orders and products, and stream-ID-filtered `live_streams` updates. Supabase stream/reel product relations are hydrated from `stream_products`/`reel_products`; stream create/update writes maintain the relation table. The app maps these records to arrays expected by product, reel, and AI views.

---

### Priority 5: Supabase Auth Bridge
- **Status: Source fixes implemented; remote migration status unverified.** Non-demo sign-in/sign-up uses Supabase Auth, profile/order/vendor data refreshes after login, logout signs out remotely, and profile updates persist to `public.profiles`. Password changes reauthenticate and call Supabase Auth instead of trying to write a password column. Migration 08 creates pending vendor stores in the auth trigger, including when email confirmation delays the first session. Seeded demo accounts remain local; new account roles are limited to customer/vendor.

---

### Priority 6: Multilingual (i18n) Coverage
- **Status: Complete for the requested customer journey.** Bangla translations are wired into Cart, Checkout, Product Catalog, and Product Details, including filters, checkout steps, payment labels, stock states, reviews, and primary actions. Product titles and descriptions remain in their original language.

### Priority 7: Groq AI Integration
- **Status: Implemented in source; deployment key status not verifiable from this workspace.** AI actions use the Vercel `/api/ai` serverless proxy. The Groq key is read only from server environment variables. The proxy validates allowlisted actions and outputs, limits request size, applies in-memory rate limiting, and local heuristics remain as fallback. Any key pasted into chat must be revoked and rotated before configuration.

### Priority 8: Payment and Atomic Checkout
- **Status: Atomic COD checkout implemented; online payments remain disabled.** Live orders call `place_order_atomic` from migration 08, which derives item pricing and updates stock/order rows transactionally. The UI and service reject card/bKash/Nagad until a provider and verified payment webhook exist. COD becomes paid on delivery; approved refunds and payout requests still require the actual external money transfer to be processed.

### Priority 9: Vendor Sensitive-Field Authorization
- **Status: Source migration implemented; remote application pending verification.** Migration 08 protects vendor ownership, approval, verification, rating, followers, commission, and balance fields; it also prevents self-service profile role/status escalation, restricts public profile reads, scopes Storage uploads to vendor folders, and moves follow counters behind a server RPC.

---

## 📋 3. Implementation Checklist

- [x] **Task 1: PWA Service Worker & Registration**
  - [x] Add root service worker with core precache, network-first navigation, and offline fallback.
  - [x] Register idempotently from storefront, dashboard, and auth page layouts.
  - [x] Handle the install prompt globally; the visible install CTA remains on the home page.

- [x] **Task 2: Supabase Storage Integration & File Upload Fix**
  - [x] Upload files to Supabase Storage with compressed-image and IndexedDB video fallbacks.
  - [x] Use `product-images` for product photos and `reels` for uploaded video files.

- [x] **Task 3: Supabase RLS & Order Insertion Fixes**
  - [x] Remove direct client order/item INSERT access and verify the authenticated customer before invoking the order RPC.
  - [x] Add forward migrations `06_auth_order_hardening.sql` and `07_rls_recursion_fix.sql`, including vendor-owner backfill and recursion-safe policies.
  - [x] Add migration 08 for role/vendor field protections, atomic checkout, order transitions, and payout RPCs.

- [x] **Task 4: Supabase Realtime Postgres Changes Subscription**
  - [x] Subscribe to order/product tables and per-stream `live_streams` rows; sync the local cache before dispatch.

- [x] **Task 5: Supabase Auth Bridge**
  - [x] Use Supabase Auth for live accounts and preserve local demo login.

- [x] **Task 6: Frontend i18n Expansion**
  - [x] Expand Bangla translations on `cart.js`, `checkout.js`, `products.js`, and `product.js`.

- [x] **Task 7: Groq AI Proxy Integration**
  - [x] Add Vercel API actions for product/reel ranking, support chat, auto-tagging, product tags/descriptions, and moderation assistance.
  - [x] Keep credentials server-side and preserve local AI fallbacks.

- [x] **Task 8: Backend Write Hardening**
  - [x] Add migration 08 for server-derived atomic COD checkout and inventory updates.
  - [x] Add protected vendor fulfillment, customer/admin cancellation, payout, follow, and dispute RPCs.
  - [x] Restrict authenticated profile/vendor fields and media uploads by owner.

## Verification & Operational Notes

- Verified on 2026-09-28: 93 source JavaScript files parse successfully; all 91 browser modules have resolvable relative imports; all 47 project HTML pages have no missing local `src`/`href` targets; `git diff --check` passes. The deployed homepage URL opened, but customer/vendor/admin workflows were not exhaustively browser-tested. No package manifest or automated test suite is present in the repository.
- The remote Supabase project was not mutated as part of this workspace check, and its applied migration state was not independently verified. The migration 08 script executed in an isolated PGlite PostgreSQL instance. Smoke tests passed for role/vendor protection, server-derived pricing, COD-only enforcement, atomic inventory/order changes, delivery credit, payout reserve/refund, customer/admin cancellation restock, confirmation-safe vendor onboarding, follow counters, vendor-scoped uploads, and dispute resolution without marking a refund paid.
- Runtime behaviors represented in source include guarded network-first service-worker caching, local media fallbacks, Supabase Auth for non-demo accounts, and realtime subscriptions with same-browser fallbacks. Apply migration 08 to the remote Supabase project before using the updated live checkout, order status, dispute, follow, storage-upload, or payout code; no production credentials or database state were inspected.
- Guest checkout is not implemented; order creation is intentionally authenticated to match the current checkout UI and avoid public unrestricted writes.
