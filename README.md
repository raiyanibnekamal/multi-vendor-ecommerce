# StreamCart | Watch. Shop. Live.

[**Visit the live app →**](https://multi-vendor-ecommerce-ten.vercel.app/)

## About StreamCart

StreamCart is a multi-vendor social-commerce marketplace that brings product discovery and shopping together. Customers can browse stores, shop products featured in short videos, and explore live-shopping experiences from one place.

Vendors get tools to manage products, orders, reels, and live sessions. Platform admins can review vendors and products, moderate content, manage disputes, and oversee marketplace activity.

The project is built with HTML, CSS, and vanilla JavaScript. Supabase powers configured authentication and marketplace data; optional Groq AI features run through a Vercel serverless endpoint, with local fallbacks for demo use. Checkout currently supports COD plus secure mock card, bKash, and Nagad flows; real payment-provider capture and production live-video transport still require provider integration.

Explore the [architecture](docs/ARCHITECTURE.md), [project audit and roadmap](docs/AUDIT_AND_ROADMAP.md), and [Supabase setup guide](supabase/README.md).

## 🚀 Latest Updates

- **Current status (Sept 2026):** polished storefront home, reels, live shopping, account flows, admin and vendor dashboards, and seeded demo commerce flows are in the repo and working as a frontend prototype.
- **Supabase:** Auth bridge, Storage uploads, Realtime subscriptions, and secured order/write flows are implemented in source; the matching remote database migrations still need to be applied to a live project.
- **Orders & payments:** Atomic order placement, stock locking, COD plus secure mock card/bKash/Nagad methods, customer/vendor/admin notifications, realtime dashboard updates, and downloadable/printable order slips are implemented.
- **Security:** SQL/RPC privilege hardening, RLS boundaries, upload allowlists, media URL sanitization, API limits, CSP/HSTS/security headers, and migrations 10-11 are in the source tree.
- **AI:** Optional Groq-backed ranking, recommendations, chat, tagging, descriptions, and moderation review through the server-side Vercel `/api/ai` proxy, with local heuristics as fallback.
- **Multilingual UI:** English/Bangla toggle across core shopping, catalog, cart, checkout, and live-buy flows.
- **Themes & PWA:** Light/dark modes, persistent theme state, install prompt support, offline caching, and service-worker-safe asset handling.
- **What remains production-bound:** replacing mock payments with a signed provider/webhook integration, actual payout execution, live video provider token flow, and verified remote Supabase migration deployment.

## Run locally

The app uses ES modules, so it must be served over HTTP (opening the file directly won't work).

- **Recommended (app + Vercel API routes):** `npx vercel dev --listen 8000` → open http://127.0.0.1:8000
- **Static UI only:** `python -m http.server 5500` or VS Code Live Server. The UI works, but `/api/ai` is unavailable and AI calls use local fallbacks.

An internet connection is needed for fonts, icons (Lucide), charts (Chart.js), product images and sample videos.

### Current backend status

The Supabase project is configured in `assets/js/core/config.js`. Live auth, catalog reads, reel/stream reads, order writes, notifications, and Realtime updates use Supabase when configured; demo accounts and offline state still use browser storage for local testing. Apply migrations 01–11 in order before using live registration, checkout, order status, notifications, follows, uploads, disputes, or payouts. Migration 07 fixes order-policy recursion; migration 08 protects profile/vendor fields and moves commerce writes behind checked RPCs; migration 10 hardens public RPC privileges and stream messages; migration 11 adds payment metadata, secure mock-payment wrapping, order notifications, and Realtime publication. Checkout's card/bKash/Nagad options are mock-only until a provider and signed webhook are integrated. Refund issuance, payout transfer, and live-video transport still need external provider workflows.

### Security and production readiness

- Supabase RLS and security-definer RPCs enforce customer/vendor/admin boundaries; browser role guards are UX only.
- SQL writes use fixed-parameter RPCs or Supabase query builders; no user-controlled dynamic SQL path is used.
- Upload MIME/size allowlists, unsafe media URL rejection, HTML attribute escaping, API body/rate/concurrency limits, and Vercel CSP/HSTS/security headers are implemented.
- Apply migrations 01-11 in the hosted Supabase project and verify them before production traffic. Do not put service-role or payment secrets in browser code.
- Real payment capture requires an official gateway adapter, signed webhook verification, idempotency, failure handling, and refund reconciliation.

## Groq AI setup

Recommendations, reel ranking, semantic product-search ranking, support-chat fallback, reel auto-tagging, product tag/description generation, and on-demand moderation review call Groq through the Vercel serverless endpoint at `/api/ai`; local ranking/rules remain as fallback. The Groq key is never sent to browser code. In Vercel Project Settings → Environment Variables, add `GROQ_API_KEY` using a rotated key, then redeploy. Optionally set `GROQ_MODEL` to override the default model.

For local AI testing, use the linked Vercel project with `npx vercel dev` and configure `GROQ_API_KEY` as a Development environment variable via `npx vercel env add GROQ_API_KEY development`. Enter the secret directly in the terminal prompt; do not put it in source files or commit it. Set the same variable in Vercel Project Settings and redeploy to enable AI in production. A key previously pasted into chat should be revoked and rotated. If the endpoint or key is unavailable, AI features fall back to their local heuristic behavior.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | customer@demo.com | demo123 |
| Vendor (TechNest BD) | vendor@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

The login page also has one-click demo buttons. Demo accounts and offline state use browser storage; configured live accounts and catalog/order data use Supabase. Use **Admin → Settings → Reset demo data** to clear local demo state.

## Things to try

1. **Reels → Buy now:** open *Reels*, tap a tagged product, and check out without leaving the video.
2. **Live shopping across tabs:** log in as the vendor, open *Go live studio*, then click *Open viewer page*. Pin a product or chat in the studio and watch it appear in the viewer tab; buy from the viewer tab and the order pops up in the studio.
3. **Realtime orders:** keep the vendor dashboard open in one tab and place an order in another.
4. **Order proof:** after checkout, download or print the order slip from the confirmation page.
5. **AI:** smart search (`phone under 30000`, `laptpo`), the assistant chat bubble, *For you* recommendations, and auto-tag suggestions on *Vendor → New reel*.
6. **Admin:** approve pending vendors, moderate reels, resolve disputes, approve payouts, edit the category tree.

## Pages

- **Storefront:** home, categories, product listing with filters, product detail, search, vendor store, cart, checkout, order success
- **Video commerce:** reels feed, live streams list, live watch page
- **Account:** profile, orders + tracking, wishlist, saved reels, following, addresses
- **Vendor (13):** overview, products, product form, inventory, orders, order detail, reels, reel upload, live streams, go-live studio, analytics, messages, settings
- **Admin (12):** overview, vendors, vendor detail, customers, products, categories, moderation, orders, disputes, payouts, analytics, settings
