# StreamCart — Comprehensive Codebase Audit, Gaps & Implementation Roadmap

> **Audit Date:** 2026-09-28
> **Repository:** `raiyanibnekamal/multi-vendor-ecommerce`
> **Status:** Active Maintenance & Bug Fixing
> **Live app:** [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/)

---

## 📊 1. Codebase Overview & Current Status

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
- **Status: Source fix complete; applied migration status unverified.** Live accounts use the Supabase Auth UUID, and awaited order/item writes require it to match the current Auth user before checkout resolves. Seeded demo accounts remain local. An earlier read-only request reproduced `42P17` recursion on both orders and order_items, including a plain orders-only query. Migration `07_rls_recursion_fix.sql` makes role/vendor/order security-definer helpers use a fixed search path, disables RLS internally, and runs as `postgres`; it also recreates the orders/order_items policies. The checkout flow requires sign-in, so anonymous `WITH CHECK (true)` policies are not added. Client-supplied signup metadata cannot assign the admin role.
- **Existing deployments:** Run `supabase/migrations/07_rls_recursion_fix.sql` after the earlier migrations. It replaces any overlapping order policies and supersedes the order helper portion of migration 06. The live project was not mutated from this workspace.

---

### Priority 4: Supabase Realtime Listener (Postgres Changes)
- **Status: Complete.** Realtime channels listen to Postgres Changes for orders and products, and stream-ID-filtered `live_streams` updates. Supabase stream/reel product relations are hydrated from `stream_products`/`reel_products`; stream create/update writes maintain the relation table. The app maps these records to arrays expected by product, reel, and AI views.

---

### Priority 5: Supabase Auth Bridge
- **Status: Complete.** Non-demo sign-in/sign-up uses Supabase Auth, profiles are mapped into the app session, logout signs out remotely, and profile updates persist to `public.profiles`. Seeded demo accounts remain local. Live account passwords are not stored in the local app database. New account roles are restricted by the database trigger to customer/vendor.

---

### Priority 6: Multilingual (i18n) Coverage
- **Status: Complete for the requested customer journey.** Bangla translations are wired into Cart, Checkout, Product Catalog, and Product Details, including filters, checkout steps, payment labels, stock states, reviews, and primary actions. Product titles and descriptions remain in their original language.

### Priority 7: Groq AI Integration
- **Status: Implemented in source; deployment key status not verifiable from this workspace.** AI actions use the Vercel `/api/ai` serverless proxy. The Groq key is read only from server environment variables. The proxy validates allowlisted actions and outputs, limits request size, applies in-memory rate limiting, and local heuristics remain as fallback. Any key pasted into chat must be revoked and rotated before configuration.

### Priority 8: Payment and Atomic Checkout
- **Status: Not production-ready.** The frontend writes the order header and items as separate Supabase requests and adjusts stock separately; it does not call the `place_order_atomic` RPC defined in `05_rpc.sql`. The current order flow marks every non-COD method paid without a payment-provider confirmation. Add a trusted checkout/payment-webhook flow and connect the atomic stock/order operation before accepting real payments.

### Priority 9: Vendor Sensitive-Field Authorization
- **Status: Needs hardening.** The vendor UPDATE policy in `02_rls.sql` checks that the user owns the vendor row, but does not limit changes to specific columns. Enforce sensitive-field protection for commission/status/verification in the database before production use.

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
  - [x] Restrict order and item INSERT policies to the authenticated customer who owns the order.
  - [x] Verify the customer UUID against the active Supabase Auth session before remote insertion.
  - [x] Add forward migrations `06_auth_order_hardening.sql` and `07_rls_recursion_fix.sql`, including vendor-owner backfill and recursion-safe policies.

- [x] **Task 4: Supabase Realtime Postgres Changes Subscription**
  - [x] Subscribe to order/product tables and per-stream `live_streams` rows; sync the local cache before dispatch.

- [x] **Task 5: Supabase Auth Bridge**
  - [x] Use Supabase Auth for live accounts and preserve local demo login.

- [x] **Task 6: Frontend i18n Expansion**
  - [x] Expand Bangla translations on `cart.js`, `checkout.js`, `products.js`, and `product.js`.

- [x] **Task 7: Groq AI Proxy Integration**
  - [x] Add Vercel API actions for product/reel ranking, support chat, auto-tagging, product tags/descriptions, and moderation assistance.
  - [x] Keep credentials server-side and preserve local AI fallbacks.

## Verification & Operational Notes

- Verified on 2026-09-28: 93 source JavaScript files parse successfully; all 91 browser modules have resolvable relative imports; all 47 project HTML pages have no missing local `src`/`href` targets; `git diff --check` passes. The deployed homepage URL opened, but customer/vendor/admin workflows were not exhaustively browser-tested. No package manifest or automated test suite is present in the repository.
- The remote Supabase project was not mutated as part of this workspace check, and its applied migration state was not independently verified. Apply migrations through `07_rls_recursion_fix.sql` to existing projects and confirm Storage buckets/policies before testing live orders/uploads.
- Runtime behaviors represented in source include guarded network-first service-worker caching, local media fallbacks, Supabase Auth for non-demo accounts, and realtime subscriptions with same-browser fallbacks. Live API environment variables and database policies need deployment-side verification; no production credentials or database state were inspected.
- Guest checkout is not implemented; order creation is intentionally authenticated to match the current checkout UI and avoid public unrestricted writes.
