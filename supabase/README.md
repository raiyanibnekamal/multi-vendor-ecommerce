# StreamCart — Supabase Backend Guide

This folder contains the complete, production-ready backend for **StreamCart** designed to run 100% on **Supabase Free Tier**.

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

---

## 🚀 Quick Setup Instructions (5 Minutes)

### Step 1: Create a Free Project on Supabase
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose a project name (e.g., `streamcart-backend`), set a database password, and select your nearest region (e.g., Singapore).
4. Wait ~2 minutes for the database to provision.

### Step 2: Run Database Setup
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of [`supabase/setup.sql`](setup.sql) and paste it into the editor.
4. Click **Run** (Ctrl + Enter).
   > ✅ All 22 tables, RLS security rules, storage buckets, realtime channels, and stored procedures are now created!

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
3. Open `assets/js/core/config.js` in your project:
   ```javascript
   export const CONFIG = {
     // ...
     USE_MOCK: false, // Set to false to use Supabase
     SUPABASE_URL: 'YOUR_SUPABASE_PROJECT_URL',
     SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
     // ...
   };
   ```

### Step 5: Deploy Frontend to Vercel (100% Free)
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and import your `multi-vendor-ecommerce` repo.
3. Keep default settings and click **Deploy**.
4. Your full-stack multi-vendor live shopping platform is now live on the internet!
