# StreamCart — Supabase Backend Guide

This folder contains the Supabase schema, policies, seed data, and deployment scripts used by StreamCart. It is not a complete production commerce backend by itself; payment webhooks, payout execution, and live-video transport still require trusted provider integrations.

The frontend is deployed at [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/). Existing databases should apply migrations in order. Migration 07 fixes recursive RLS policies observed on the live orders endpoint.

---

## 📁 Files Overview

| File | Purpose |
|---|---|
| [`setup.sql`](setup.sql) | **All-in-one setup script** (Schema + RLS + Storage + Realtime + RPC). Copy and paste this directly into the Supabase SQL Editor. |
| [`seed.sql`](seed.sql) | Comprehensive seed data (Categories, Vendors, Products, Shoppable Reels, Live Streams, Payouts, Disputes). |
| [`migrations/01_schema.sql`](migrations/01_schema.sql) | Core DDL tables, foreign key constraints, and automated counters triggers. |
| [`migrations/02_rls.sql`](migrations/02_rls.sql) | Bulletproof Row Level Security (RLS) policies for Customer, Vendor, and Admin isolation. |
| [`migrations/03_storage.sql`](migrations/03_storage.sql) | Storage buckets (`product-images`, `reels`, `avatars`) and file upload policies. |
| [`migrations/04_realtime.sql`](migrations/04_realtime.sql) | Realtime publication configuration for live chat, pinned products, and instant vendor order alerts. |
| [`migrations/05_rpc.sql`](migrations/05_rpc.sql) | Atomic stored procedures (`place_order_atomic`, `pin_stream_product`, `request_vendor_payout`, `adjust_stream_viewers`). |
| [`migrations/06_auth_order_hardening.sql`](migrations/06_auth_order_hardening.sql) | Signup role restrictions, customer-owned order inserts, and seeded vendor ownership backfill. |
| [`migrations/07_rls_recursion_fix.sql`](migrations/07_rls_recursion_fix.sql) | Replaces order policies and makes policy helpers RLS-independent to prevent `42P17` recursion. |

---

## 🚀 Quick Setup Instructions (5 Minutes)

### Step 1: Create a Free Project on Supabase
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose a project name (e.g., `streamcart-backend`), set a database password, and select your nearest region (e.g., Singapore).
4. Wait ~2 minutes for the database to provision.

### Step 2: Run Database Setup (new project only)
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of [`supabase/setup.sql`](setup.sql) and paste it into the editor.
4. Click **Run** (Ctrl + Enter).
   > This all-in-one script is for a fresh project. Do not rerun it over an existing database; use the ordered migrations instead.

### Step 3: Populate Demo Seed Data
1. In the **SQL Editor**, open a new tab.
2. Copy the entire contents of [`supabase/seed.sql`](seed.sql) and paste it into the editor.
3. Click **Run**.
   > ✅ All initial categories, vendor stores, products, shoppable reels, and live streams are now seeded!

### Step 4: Connect to Frontend
1. In Supabase, go to **Project Settings** → **API**.
2. Copy:
   - **Project URL** (`https://xyz.supabase.co`)
   - **anon / public key** (`eyJhbGciOi...`)
3. Configure the project URL and anon/publishable key in `assets/js/core/config.js` (this workspace already has public client settings configured):
   ```javascript
   export const CONFIG = {
     // ...
     USE_MOCK: false, // Set to false to use Supabase
     SUPABASE_URL: 'YOUR_SUPABASE_PROJECT_URL',
     SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
     // ...
   };
   ```

### Step 5: Deploy the Frontend to Vercel
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and import your `multi-vendor-ecommerce` repo.
3. Keep default settings and click **Deploy**.
4. The current frontend is also available at [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/).

## Existing project migrations

For an existing database, apply migrations 01 through 07 in order. In particular, run [`migrations/07_rls_recursion_fix.sql`](migrations/07_rls_recursion_fix.sql) in the Supabase SQL Editor to replace recursive policies on `orders` and `order_items`. The app does not run SQL migrations automatically. Verify with read-only requests to both tables; PostgreSQL `42P17` should no longer occur.

The SQL `place_order_atomic` function is defined in migration 05, but the current browser checkout does not call it: the frontend inserts the order and items separately and changes stock separately. The browser also marks non-COD orders paid without a payment-provider confirmation. Do not accept real payments until a trusted payment integration and atomic checkout path are implemented.

Review the vendor UPDATE policy before production: the current ownership check does not restrict sensitive columns such as commission rate, status, or verification. Do not place a Supabase service-role key in frontend configuration. Guest checkout is intentionally unsupported; order creation requires a matching Supabase Auth user.
