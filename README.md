# StreamCart

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel&logoColor=white)](https://multi-vendor-ecommerce-ten.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20CSS-yellow)](https://developer.mozilla.org/)
[![Database](https://img.shields.io/badge/Backend-Supabase%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Auth](https://img.shields.io/badge/Auth-Firebase%20Google%20OAuth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Video RTC](https://img.shields.io/badge/Live%20Video-Agora%20RTC-099DFD)](https://www.agora.io/)
[![AI](https://img.shields.io/badge/AI-Groq%20AI-F55036)](https://groq.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple)](manifest.webmanifest)

StreamCart is a next-generation multi-vendor social-commerce web application. Customers discover and buy products seamlessly through a modern storefront, shoppable vertical video reels, and interactive live shopping broadcasts. Vendors manage their stores, products, fulfillment, reels, and live studio. Administrators oversee platform vendors, dispute resolutions, payouts, moderation, and marketplace configurations.

- **🌐 Live Web App:** [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/)
- **⚡ Tech Stack:** HTML5, CSS3, Vanilla JavaScript ES Modules, Supabase (PostgreSQL 15+, Auth, Storage, Realtime, RPCs), Firebase Auth (Google OAuth), Agora RTC Web SDK, Vercel Serverless Functions, Optional Groq AI (`openai/gpt-oss-120b`).
- **📱 Application Scale:** 47 tracked HTML pages across Storefront, Account, Reels, Live, Vendor Studio, and Admin Panel.
- **📚 Documentation:** [Architecture Guide](docs/ARCHITECTURE.md) | [Audit & Roadmap](docs/AUDIT_AND_ROADMAP.md) | [Project Status Report](PROJECT_STATUS.md) | [Supabase Setup Guide](supabase/README.md)

---

## 📑 Table of Contents

- [Project Status](#project-status)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Supabase Backend Setup](#supabase-backend-setup)
- [User Journeys & Features](#user-journeys--features)
  - [Customer Experience](#customer-experience)
  - [Vendor Studio](#vendor-studio)
  - [Admin Console](#admin-console)
- [Agora Live Video Engine](#agora-live-video-engine)
- [AI Features (Groq + Local Fallback)](#ai-features)
- [Local Demo Accounts](#local-demo-accounts)
- [Data and Request Architecture](#architecture)
- [Security & Production Boundaries](#security-boundaries)
- [Troubleshooting Guide](#troubleshooting)
- [Verification Record](#verification-record)
- [Repository Map](#repository-map)

---

<a id="project-status"></a>
## 📊 Project Status

The repository contains both a **browser-persistent demo mode** (instant local exploration) and **secure backend integrations** for real Supabase-authenticated users.

| Area | Implemented in Source | Still Required for Production |
|---|---|---|
| **Storefront, Catalog & Cart** | ✅ Yes | Verify live database migrations and storage bucket policies. |
| **Authentication & Roles** | ✅ Supabase Auth + Firebase Google OAuth + 1-click Demo | Configure Supabase Auth redirect URLs, SMTP email, and real accounts. |
| **COD Orders & Checkout** | ✅ Atomic DB RPC + Demo flow | Apply migrations 01-11 to hosted database. |
| **Online Payments (Card/bKash/Nagad)** | ⚠️ Demo/Mock flows only | Official gateway adapter, signed webhook, and reconciliation. |
| **Order Cancellation & Stock Restore** | ✅ Atomic DB RPC + Demo local | Verify hosted migrations and table permissions. |
| **Disputes & Customer Returns** | ✅ Full UI + DB Status flow | Manual bank/gateway transfer needed for actual monetary refund. |
| **Vendor Payout Requests** | ✅ Reserve balance RPC + Admin flow | Real payout settlement via bank/mobile wallet is external. |
| **Live Video Commerce** | ✅ Agora Web SDK + Secure Token API | Agora project credentials and network configuration. |
| **Live Chat, Pin & Reactions** | ✅ Supabase Realtime + Broadcast fallback | Realtime publication enabled in Postgres. |
| **AI Smart Features** | ✅ Groq Proxy + Local heuristics | Optional `GROQ_API_KEY` for live LLM reranking and copy. |
| **PWA & Offline Support** | ✅ Manifest + Service Worker | Device-specific testing and cache validation. |

---

<a id="quick-start"></a>
## 🚀 Quick Start

### Prerequisites
- **Node.js:** v20.0.0 or newer
- **Browser:** Modern browser (Chrome, Edge, Safari, Firefox) with camera/microphone access on `localhost` or HTTPS.

### 1. Installation & Run Locally

```powershell
# Navigate to the workspace
cd D:\Projects\E-COMMERCE

# Install dependencies (Agora RTC SDK, token builder, dotenv)
npm install

# Start the local development server (serves static files + /api endpoints)
npm start
```

Open **http://localhost:8000** in your browser.

> [!TIP]
> **Custom Port:** To run on a different port, set the environment variable:
> ```powershell
> $env:PORT='8003'; npm start
> ```

> [!NOTE]
> For Vercel's local serverless environment, run `npx vercel dev --listen 8000`. Using simple static servers like Python HTTP or VS Code Live Server will display pages, but serverless API routes (`/api/ai` and `/api/agora-token`) will not be active.

---

<a id="environment-variables"></a>
## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the project root:

```powershell
cp .env.example .env
```

| Variable | Required For | Description & Example |
|---|---|---|
| `SUPABASE_URL` | Supabase API & Agora Token API | Project URL (e.g. `https://your-project.supabase.co`). |
| `SUPABASE_ANON_KEY` | Public client & token authorization | Supabase anonymous public key. |
| `AGORA_APP_ID` | Realtime Live Video | App ID from your Agora developer console. |
| `AGORA_APP_CERTIFICATE` | Live Video Security | Secret App Certificate for token minting. Keep server-side only! |
| `AGORA_ALLOW_DEMO_PUBLISHER` | Local Broadcast Testing | Set to `true` **only** in local `.env` to test host broadcasting with demo vendor `v1`. **Never set in Vercel.** |
| `GROQ_API_KEY` | Serverless AI Features | (Optional) Groq API Key. Without it, the app uses intelligent local fallbacks. |
| `GROQ_MODEL` | AI Model Selection | Defaults to `openai/gpt-oss-120b` (or `qwen/qwen3.8-27b`). |
| `FIREBASE_API_KEY` | Google Authentication | Public Firebase Web API Key for Google OAuth. |
| `FIREBASE_AUTH_DOMAIN` | Google Authentication | Firebase Auth Domain (e.g., `project-id.firebaseapp.com`). |
| `FIREBASE_PROJECT_ID` | Google Authentication | Firebase Project ID. |
| `FIREBASE_STORAGE_BUCKET`| Google Authentication | (Optional) Firebase Storage Bucket. |
| `FIREBASE_MESSAGING_SENDER_ID`| Google Authentication | (Optional) Firebase Messaging Sender ID. |
| `FIREBASE_APP_ID` | Google Authentication | Firebase Web Application ID. |
| `PORT` | Local Server | Defaults to `8000`. |

> [!WARNING]
> Never commit secrets or push `.env` to GitHub. The `.gitignore` file is pre-configured to keep your keys safe.

---

<a id="supabase-backend-setup"></a>
## 🗄️ Supabase Backend Setup

Public client keys are configured in `assets/js/core/config.js`. Real accounts use **Supabase Auth (UUIDs)**, while demo accounts use browser-local storage.

### Applying Migrations to Supabase

1. Open your Supabase Dashboard: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** → **New Query**.
3. Copy and run [`supabase/apply_all_forward_migrations.sql`](supabase/apply_all_forward_migrations.sql).
   > ✅ In a single execution, this script sets up:
   > - Fixes PostgreSQL recursive RLS policies (`42P17`).
   > - Creates storage buckets: `product-images`, `reels`, `avatars` with RLS.
   > - Installs atomic stored procedures (`place_order_atomic`, `cancel_my_order`, `request_vendor_payout`, etc.).
   > - Creates `notifications` table and automated triggers for order updates.
   > - Activates Realtime publication on `orders`, `order_items`, `products`, `live_streams`, `stream_messages`, and `notifications`.

---

<a id="user-journeys--features"></a>
## 🎯 User Journeys & Features

<a id="customer-experience"></a>
### 1. Customer Experience

* **🛍️ Discovery & Storefront:**
  - Modern homepage with hero slider, category pills, reels carousel, active live shopping banner, and curated recommendations.
  - Multi-attribute catalog filtering (price range, category hierarchy, rating, sorting).
  - High-performance smart search with local synonym detection, price parsing, and typo tolerance.
* **🛒 Cart & Seamless Checkout:**
  - Vendor-grouped cart, coupon codes, and dynamic free shipping threshold calculation.
  - Multi-payment support: Real Cash on Delivery (COD) and visual demo gateways for Card, bKash, and Nagad.
  - Downloadable and printable visual invoice receipt upon order placement.
* **👤 Account Care & Self-Service:**
  - Order tracking with timeline stages (`pending` → `processing` → `shipped` → `delivered`).
  - Self-service order cancellation for pending orders with automatic stock restoration.
  - Post-delivery dispute/return filing and "Buy Again" one-click cart re-population.
  - Wishlists, followed vendor stores, and saved reels library.
* **🔐 Modern Authentication & Google OAuth:**
  - Modernized Auth pages (`pages/auth/login.html`, `pages/auth/register.html`) styled to StreamCart's visual brand with glassmorphic cards and dark/light mode parity.
  - 1-click Google Sign-In / Sign-Up powered by Firebase modular client SDK with session bridge to Supabase profiles.
  - Dedicated 1-click Demo Role switcher (Customer, Vendor, Admin) for instant friction-free testing.
* **📱 Shoppable Reels & Live Shopping:**
  - Full-screen vertical swipe reels feed with instant quick-buy drawer (buy without pausing/leaving the video).
  - Interactive live stream viewer room with real-time video, floating heart reactions, pinned product drawer, and live chat.

---

<a id="vendor-studio"></a>
### 2. Vendor Studio

* **📊 Command Center & Analytics:**
  - Real-time revenue analytics, order status distribution, low-stock warnings, and performance graphs using Chart.js.
* **📦 Product & Inventory Management:**
  - Full product CRUD with multi-image drag-and-drop uploads directly to Supabase Storage (`product-images`).
  - Built-in "Write with AI" description generator and automatic product tag extractor.
  - Inventory threshold alerts and inline stock level editor.
* **🚚 Fulfillment Workflow:**
  - Isolated vendor view showing only items belonging to their store.
  - Strict order lifecycle controls: `pending` → `processing` → `shipped` → `delivered`.
* **🎥 Reels & Content Studio:**
  - Upload short shoppable videos with tag-to-product linking and AI hashtag suggestions.
  - Metrics tracking: views, likes, and sales generated per video reel.
* **🎙️ Live Selling Studio:**
  - Agora RTC camera and microphone streaming directly from the browser.
  - Dynamic in-stream product pinning (instantly highlights the product on all viewer screens).
  - Real-time host chat moderation and live audience viewer count.
* **💰 Financials & Payouts:**
  - Automated platform commission calculation, available balance ledger, and one-click withdrawal requests.

---

<a id="admin-console"></a>
### 3. Admin Console

* **📈 Platform Overview:**
  - Marketplace-wide GMV, platform commission tally, total vendor count, and order fulfillment metrics.
* **🏬 Vendor Governance:**
  - Vendor onboarding queue: review store applications, approve, reject, or suspend stores.
  - Detailed store profiles with revenue share, order defect rates, and payout history.
* **🛡️ Content & Reel Moderation:**
  - Dedicated moderation queue for vendor-uploaded video reels with interactive video preview.
  - On-demand AI decision support (Groq Llama 3.3) to assess video captions for safety before approving or rejecting.
* **⚖️ Dispute Resolution & Returns:**
  - Buyer-vendor conflict arbitration dashboard.
  - Decision options: mark as investigating, reject claim, or record refund approved.
* **💳 Payout Approvals:**
  - Review vendor withdrawal requests, verify order fulfillment, and update payout status (`approved`, `paid`, `rejected`).
  - Automatic balance restoration upon payout rejection.
* **⚙️ Marketplace Settings:**
  - Platform-wide commission rates, shipping charges, free shipping tiers, and 1-click demo data reset.

---

<a id="agora-live-video-engine"></a>
## 📹 Agora Live Video Engine

StreamCart features an enterprise-grade live video commerce architecture powered by the **Agora Web RTC SDK**:

```
┌───────────────────────────┐                   ┌───────────────────────────┐
│   Vendor Go-Live Studio   │                   │    Customer Watch Room    │
│  (Broadcaster / Host Mic) │                   │     (Audience Player)     │
└─────────────┬─────────────┘                   └─────────────▲─────────────┘
              │                                               │
              │ 1. Request RTC Token                          │ 1. Request Join Token
              ▼                                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│               Serverless Token Minting (/api/agora-token.js)              │
│       - Validates Supabase JWT Session & Vendor Store Ownership           │
│       - Mints 10-Minute Ephemeral RTC Token with Server-Derived UID       │
└─────────────┬───────────────────────────────────────────────▲─────────────┘
              │                                               │
              │ 2. Publish Camera/Mic                         │ 2. Subscribe Stream
              ▼                                               │
┌─────────────────────────────────────────────────────────────┴─────────────┐
│                             Agora SD-RTN™ Network                         │
│                    (Ultra-Low Latency Video Streaming)                    │
└───────────────────────────────────────────────────────────────────────────┘
```

1. **Broadcaster Security:** Real broadcasters must present a valid Supabase JWT and prove ownership of the approved vendor hosting the stream.
2. **Audience Access:** Viewers receive a strictly scoped "subscriber" token allowing audio/video reception without broadcast capabilities.
3. **Local Demo Testing:** Setting `AGORA_ALLOW_DEMO_PUBLISHER=true` in local `.env` allows the seeded demo vendor (`v1`) to stream without Supabase Auth. This setting is strictly rejected in production environments.

---

<a id="ai-features"></a>
## 🤖 AI Features (Groq + Local Fallback)

All browser AI calls are routed through the secure same-origin `/api/ai` serverless proxy. The Groq API key is never exposed to the client. The default model is configured as `openai/gpt-oss-120b` (or `qwen/qwen3.8-27b`) with 1,000 max tokens headroom to prevent truncation from model reasoning tokens.

| Feature | Local Heuristic Fallback (No Key Needed) | Groq AI Enhanced Action |
|---|---|---|
| **Product Recommendations** | Category affinity + best-seller cold-start ranking | `rank-products` semantic candidate reranking |
| **Reels Feed Personalization** | Local category affinity, recency, and engagement | `rank-reels` dynamic personalization |
| **Smart Search** | Local intent parsing, budget extraction & typos | `rank-products` reranking based on query intent |
| **Reel Auto-Tagging** | Caption keyword matching against vendor catalog | `suggest-tags` catalog semantic selection |
| **Product Tag Generator** | Brand and category keyword extraction | `product-tags` SEO keyword generation |
| **Product Copywriter** | Clean formatted template instructing verification | `product-description` compelling marketing copy |
| **Shopping Assistant Chat** | Local rules for order status, returns, and FAQs | `support-chat` natural conversational support |
| **Reel Content Moderation** | Manual decision; reports AI unavailable | `moderate-reel` automated policy review |

> [!NOTE]
> If `GROQ_API_KEY` is omitted, the entire platform runs smoothly using intelligent local heuristics. No UI blocks or crashes occur.

---

<a id="local-demo-accounts"></a>
## 👥 Local Demo Accounts

For fast local testing, one-click login buttons are provided on the login page:

| Role | Email | Password | Identity & Scope |
|---|---|---|---|
| **Customer** | `customer@demo.com` | `demo123` | Customer Demo (`c1`) |
| **Vendor** | `vendor@demo.com` | `demo123` | TechNest BD (`v1`) |
| **Admin** | `admin@demo.com` | `demo123` | Platform Admin (`u-admin`) |

> [!TIP]
> Demo accounts store their data in browser `localStorage`. To reset demo records to factory defaults, visit **Admin Panel → Settings → Reset Demo Data**.

---

<a id="architecture"></a>
## 🏗️ Data and Request Architecture

```text
Browser Client (Vanilla JS Modules)
  ├── assets/js/core/config.js          -> Client environment & Supabase initialization
  ├── assets/js/core/auth.js            -> Demo identity bridge, Supabase Auth & Google OAuth
  ├── assets/js/core/firebase.js        -> Firebase Web SDK modular client & GoogleAuthProvider
  ├── assets/js/services/db.js          -> LocalStorage fallback & Supabase data facade
  ├── assets/js/services/orders.js      -> Order lifecycle & atomic RPC calls
  ├── assets/js/services/agora.js       -> Agora Web SDK video broadcast & player
  ├── assets/js/services/realtime.js    -> Supabase Realtime & BroadcastChannel sync
  └── assets/js/services/ai.js          -> Local heuristic fallbacks & /api/ai client
Serverless API Layer (Node.js / Vercel)
  ├── api/ai.js                         -> Server-side Groq LLM proxy (rate limited)
  ├── api/agora-token.js                -> Secure RTC token builder with DB authorization
  └── api/firebase-config.js            -> Public Firebase config provider (from .env)
Database & Storage (Supabase)
  └── supabase/migrations/              -> Relational schema, RLS, Storage, RPCs & Triggers
```

---

<a id="security-boundaries"></a>
## 🔒 Security & Production Boundaries

* **Authorization Boundary:** Browser role guards handle navigation UX only. True security is enforced at the database level via **Row Level Security (RLS)** and **SECURITY DEFINER** stored procedures.
* **Secrets Separation:** The public anon key is safe in browser source; the Agora App Certificate, Groq API Key, and Supabase service-role key remain strictly server-side.
* **Payment Safeguards:** Online payment choices (Card, bKash, Nagad) are demo simulations. Live production requires integrating a certified gateway with signed webhooks.
* **Content Security Policy:** Configured in `vercel.json` with strict frame protection (`DENY`), MIME sniffing prevention (`nosniff`), and allowlisted media origins (Supabase Storage, Unsplash, Agora WebRTC WSS).

---

<a id="troubleshooting"></a>
## 🛠️ Troubleshooting Guide

| Symptom | Probable Cause | Actionable Solution |
|---|---|---|
| `/api/ai` reports `not_configured` | `GROQ_API_KEY` is not set | Add `GROQ_API_KEY` to `.env` or Vercel Environment Variables and restart server. |
| Agora video reports not configured | Missing Agora credentials | Configure `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` in server environment. |
| Broadcaster token returns 401/403 | Unauthorized host stream | Sign in as the store owner who created the stream, or enable local demo broadcasting in `.env`. |
| Camera permission denied | Insecure context or permissions | Use `localhost` or HTTPS; verify browser camera/microphone permissions. |
| Live chat not updating across tabs | Realtime publication missing | Run `apply_all_forward_migrations.sql` in Supabase SQL Editor. |
| Vercel API works locally but fails live | Missing remote environment variables | Copy `.env` variables to Vercel Project Settings → Environment Variables and redeploy. |

---

<a id="verification-record"></a>
## 📋 Verification Record

**Comprehensive End-to-End Automated & Manual Smoke Test Completed (2026-09-30):**
- **Automated Headless Chrome Audit:** 25/25 automated test steps executed and passed across Storefront, Cart, Catalog, Customer, Vendor, and Admin workflows with **0 console errors** and **0 network failures**.
- **Routes & Pages:** All 47 HTML routes opened across public, customer, vendor, and admin roles with **HTTP 200 OK**.
- **Customer Journey:** Cart addition, coupon discounts, COD checkout, order receipt generation, and pending order cancellation successfully verified.
- **Authentication & Google Sign-In:** Firebase Google OAuth popup flow verified with profile creation and session caching; brand-aligned login/register redesign validated across dark/light themes.
- **Vendor Studio:** Product creation with image upload, order fulfillment transitions, and payout reservation verified.
- **Agora Live Video:** Broadcaster camera/mic stream and subscriber viewing verified at **1280×720** resolution.
- **Admin Governance:** Vendor approvals, dispute updates, payout processing, and AI moderation review verified.
- **Dependencies & Audit:** Node modules syntax verified; `npm audit --omit=dev` reported **0 vulnerabilities**.

---

<a id="repository-map"></a>
## 🗺️ Repository Map

```text
├── index.html                 # Storefront homepage
├── pages/                     # Customer shopping, checkout, account, reels, live, auth
├── vendor/                    # Vendor Studio (13 management pages)
├── admin/                     # Admin Management Console (12 platform pages)
├── assets/
│   ├── css/                   # Design system, layout, and page-specific styles
│   └── js/
│       ├── core/              # Config, auth, routes, storage, utils, PWA, firebase
│       ├── data/              # Initial seed data for offline/demo mode
│       ├── services/          # Supabase, commerce, Agora RTC, AI, realtime
│       ├── components/        # Shell layouts, cards, modals, toast, charts
│       └── pages/             # Page entry controllers (one per HTML page)
├── api/
│   ├── ai.js                  # Serverless Groq LLM proxy
│   ├── agora-token.js         # Serverless Agora RTC token builder
│   └── firebase-config.js     # Public Firebase client config provider
├── supabase/
│   ├── apply_all_forward_migrations.sql # Master single-run SQL migration
│   ├── setup.sql              # Base database schema
│   ├── seed.sql               # Marketplace demo seed data
│   └── migrations/            # Versioned SQL migrations (01 through 11)
├── dev-server.mjs             # Node.js local development server with API routing
├── manifest.webmanifest       # PWA web manifest
├── sw.js                      # Service Worker with offline caching
├── vercel.json                # Vercel deployment & security headers (CSP, HSTS)
└── package.json               # Scripts and Agora SDK dependencies
```
