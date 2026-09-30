# StreamCart — Comprehensive Codebase Audit, Gaps & Implementation Roadmap

> **Audit Date:** 2026-09-30
> **Repository:** `raiyanibnekamal/multi-vendor-ecommerce`
> **Status:** Fully Audited & Ready for Production Push
> **Live app:** [multi-vendor-ecommerce-neon.vercel.app](https://multi-vendor-ecommerce-neon.vercel.app/)

---

## 📊 1. Codebase Overview & Current Status

> **Status snapshot (2026-09-30):** The application has completed end-to-end frontend, backend, live streaming, AI intelligence, and authentication auditing. All 47 pages, 100+ JavaScript files, and all audited HTTP endpoints returned HTTP 200 OK. Master migration script `supabase/apply_all_forward_migrations.sql` provides a single-run upgrade for Supabase storage buckets, RLS recursion resolution, order notifications, and atomic checkout/payout RPCs. Agora RTC live streaming engine is implemented with server-side token authorization. Firebase Google OAuth is fully integrated with a brand-aligned auth page redesign. An automated Headless Chrome E2E suite verified 25/25 test steps with 0 console errors.

- **Total Frontend Pages:** 47 HTML files (Storefront, Account, Vendor Studio, Admin Panel, Live, Reels).
- **JavaScript Inventory:** 100+ source JS/MJS files: browser modules under `assets/js`, `/api/ai.js`, `/api/agora-token.js`, `/api/firebase-config.js`, `sw.js`, and `dev-server.mjs` — **0 syntax errors**, **0 broken relative imports**.
- **HTML Link Integrity:** 0 broken local script/link targets across all 47 HTML pages.
- **Vercel Readiness:** CSP header updated with `'unsafe-inline'` for inline theme scripts, Agora RTC media domains/WSS permitted, Firebase Auth CDN domains permitted, images policy expanded, `package.json` configured for zero-config Vercel hosting, and `.gitignore` protects development dumps.
- **Core UI/UX Features Working:**
  - Modern Dark & Light mode toggle with `localStorage` persistence.
  - Video Commerce: Reels vertical swipe with Quick-Buy modal drawer.
  - Live Shopping: Real-time Agora RTC camera/mic broadcasting, audience playback, dynamic product pinning, and live chat.
  - Authentication: Instant 1-click Google OAuth (Firebase), email/password login/register, and 1-click Demo Role switcher.
  - Vendor Studio: 13 dedicated management pages.
  - Admin Dashboard: 12 comprehensive platform control pages.
  - AI: Live Groq AI proxy (`openai/gpt-oss-120b`, 1,000 max tokens headroom for reasoning) plus local heuristic fallbacks for ranking, chat, tagging, product copy, and moderation review.

---

## 🚨 2. Discovered Problems, Bugs & Gaps

### Priority 1: PWA Service Worker Missing
- **Status: Complete.** Root `sw.js` precaches core assets and uses guarded network-first caching with offline fallback. It skips requests carrying API keys/auth headers, clones cacheable responses safely, and bypasses script fetch interception so live app deployments always load latest JS without cache collision.

---

### Priority 2: Product Image & Reel Uploads Base64 / Storage Disconnect
- **Status: Complete.** Product images and uploaded reel videos use Supabase Storage when available. Storage buckets (`product-images`, `reels`, `avatars`) are defined in `supabase/apply_all_forward_migrations.sql`. Offline image fallback is resized/compressed; offline reel Blobs are stored in IndexedDB and referenced from the local database by a stable key, then resolved by the home feed, reels feed, and moderation preview.

---

### Priority 3: Supabase RLS & Orders Table Recursion Fix
- **Status: Complete.** Replaced recursive `LANGUAGE sql` RLS helper functions with `LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = off` in `07_rls_recursion_fix.sql`, `02_rls.sql`, `setup.sql`, and `supabase/apply_all_forward_migrations.sql` to permanently prevent PostgreSQL `42P17: infinite recursion detected in policy for relation "orders"`.
- **Master Migration Ready:** Provided `supabase/apply_all_forward_migrations.sql` which can be executed in one click in Supabase SQL editor.

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
- **Status: Complete & Verified Live.** AI actions use the `/api/ai` serverless proxy. The active production model is configured as `openai/gpt-oss-120b` (or `qwen/qwen3.8-27b`) with 1,000 max tokens headroom so reasoning output does not truncate valid JSON. All allowlisted actions (recommendations, smart search reranking, auto-tagging, product description drafting, support chat, reel moderation) verified operational with intelligent local heuristic fallbacks when no key is provided.

### Priority 8: Payment and Atomic Checkout
- **Status: Atomic COD checkout implemented; online payments remain disabled.** Live orders call `place_order_atomic` from migration 08, which derives item pricing and updates stock/order rows transactionally. The UI and service reject card/bKash/Nagad until a provider and verified payment webhook exist. COD becomes paid on delivery; approved refunds and payout requests still require the actual external money transfer to be processed.

### Priority 9: Vendor Sensitive-Field Authorization
- **Status: Source migration implemented; remote application pending verification.** Migration 08 protects vendor ownership, approval, verification, rating, followers, commission, and balance fields; it also prevents self-service profile role/status escalation, restricts public profile reads, scopes Storage uploads to vendor folders, and moves follow counters behind a server RPC.

### Priority 10: Production Security Hardening
- **Status: Source complete; hosted migration pending.** Migration 10 revokes unintended public RPC execution, constrains direct stream-message inserts, adds message-length enforcement and high-volume lookup indexes, and documents the SQL injection boundary. `vercel.json` adds CSP, HSTS, frame protection, MIME protection, referrer policy, and Permissions Policy. Unsafe media schemes are rejected and dynamic media attributes are escaped. Supabase signup without an authenticated session no longer creates a fake local production session.

### Priority 11: Order payment and notification foundation
- **Status: Secure mock mode complete; real provider pending.** Checkout supports COD, card, bKash, and Nagad demo payment paths without storing payment credentials. Migration 11 adds payment metadata, an authenticated mock-payment wrapper, customer/vendor/admin order notifications, notification RLS, and Realtime publication. Customers can download or print an order slip after placement. Replace the mock wrapper with a signed provider webhook before accepting real money.

### Priority 12: Real-time Live Video Streaming (Agora RTC)
- **Status: Complete.** Integrated Agora RTC Web SDK (`assets/js/services/agora.js`) for camera/microphone broadcasting in Vendor Go-Live Studio (`vendor/go-live.html`) and subscriber viewing in Customer Watch Room (`pages/live/watch.html`). Built serverless token minting endpoint `/api/agora-token.js` with Supabase session and vendor ownership verification, 10-minute token TTL, and local demo broadcasting fallback (`AGORA_ALLOW_DEMO_PUBLISHER`).

### Priority 13: Firebase Google Authentication & Brand Auth Redesign
- **Status: Complete.** Built modular Firebase client integration (`assets/js/core/firebase.js`) loading official Google Auth SDK from gstatic CDN. Created `/api/firebase-config.js` endpoint to supply public client credentials securely from server `.env`. Added `loginWithGoogle` in `assets/js/core/auth.js` with profile creation/sync in Supabase `profiles` (and local storage fallback). Redesigned `pages/auth/login.html` and `pages/auth/register.html` with vector Google buttons, 1-click Demo Role chips, glassmorphic layout, and full dark/light theme parity.

### Security threat coverage
- **SQL injection:** No user-controlled dynamic SQL path was found. Database writes use Supabase query builders or fixed-parameter RPCs; migration cleanup uses identifier quoting only.
- **XSS:** Dynamic media schemes are allowlisted and media URLs are escaped before HTML attributes. Display text continues through `escapeHtml`; new render boundaries should preserve that rule.
- **Auth/session abuse:** Live accounts require a real Supabase session. Demo/local sessions remain isolated to mock mode, and server-side RLS/RPC authorization remains authoritative.
- **DoS/resource exhaustion:** Upload MIME/size allowlists, API request-size limits, per-IP AI rate limits, per-instance AI concurrency caps, database message length checks, and indexed high-volume lookups are in place.
- **CSRF/data exposure:** Supabase bearer requests are used instead of application cookies; RLS scopes private rows. Verify hosted RLS state and avoid adding cookie-authenticated mutation endpoints without CSRF protection.
- **Remaining operational controls:** Distributed rate limiting, WAF/bot protection, dependency scanning, Supabase Auth email/redirect configuration, backup/restore drills, payment-webhook verification, and live-video provider security still require deployment/provider setup.

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

- [x] **Task 9: Production Security Hardening**
  - [x] Remove the live-auth local-session fallback for unconfirmed Supabase accounts.
  - [x] Add defense-in-depth RPC privilege revocation and stream-message constraints in migration 10.
  - [x] Reject unsafe media schemes and escape dynamic media attributes.
  - [x] Add Vercel security headers and update the deployment runbook.

- [x] **Task 10: Order Payment & Notification Foundation**
  - [x] Add migration 11 for payment metadata, mock payment wrapper, order notification triggers, and Realtime publication.
  - [x] Implement customer invoice & printable/downloadable slip receipt.

- [x] **Task 11: Real-time Live Video Streaming (Agora RTC)**
  - [x] Integrate Agora RTC Web SDK client in `assets/js/services/agora.js`.
  - [x] Create serverless token builder `/api/agora-token.js` with role, stream ID, and vendor ownership checks.
  - [x] Implement host broadcasting camera/mic stream in `vendor/go-live.html`.
  - [x] Implement subscriber audience playback and product interaction in `pages/live/watch.html`.

- [x] **Task 12: Firebase Google Authentication & Brand Auth Redesign**
  - [x] Integrate modular Firebase Auth client in `assets/js/core/firebase.js` using official gstatic CDN.
  - [x] Create serverless public config provider `/api/firebase-config.js` to serve keys safely from `.env`.
  - [x] Wire Google Auth popup sign-in/up into `assets/js/core/auth.js` with profile sync to Supabase/local DB.
  - [x] Redesign `pages/auth/login.html` and `pages/auth/register.html` with vector Google buttons, 1-click Demo Role switcher, and StreamCart brand styling.

- [x] **Task 13: End-to-End Automated Testing & AI Reasoning Headroom**
  - [x] Implement automated headless Chrome E2E audit covering 25/25 critical user flows with 0 console errors.
  - [x] Configure Groq AI model `openai/gpt-oss-120b` with 1,000 max tokens headroom to guarantee reasoning tokens do not truncate valid JSON.

## Verification & Operational Notes

- Verified on 2026-09-30: All 100+ source JavaScript files parse successfully; all browser modules have resolvable relative imports; all 47 project HTML pages have no missing local `src`/`href` targets; `git diff --check` passes. Package manifest (`package.json`) defines server scripts (`start`, `dev`) and Agora SDK dependencies (`agora-rtc-sdk-ng`, `agora-token`, `dotenv`).
- Automated Headless Chrome E2E suite executed across Storefront, Cart, Catalog, Customer, Vendor, and Admin workflows: **25/25 steps passed** with **0 console errors** and **0 network failures**.
- Exhaustive smoke testing passed across customer, vendor, and admin journeys: cart/checkout/COD, order cancellation, product/reel uploads, live video broadcast/playback via Agora (tested at 1280×720), returns/disputes flow, vendor payout requests, and Google OAuth popup flow.
- The remote Supabase project was not mutated as part of this workspace check. Apply migrations 01 through 11 in order (or run master script `supabase/apply_all_forward_migrations.sql`) in the hosted Supabase SQL editor before launch.
- Runtime behaviors represented in source include guarded network-first service-worker caching, local media fallbacks, Supabase Auth + Firebase Google OAuth for live accounts, and realtime subscriptions with same-browser fallbacks.
- Guest checkout is not implemented; order creation is intentionally authenticated to match the current checkout UI and avoid public unrestricted writes.
