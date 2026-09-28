# StreamCart — Supabase Backend Guide

This folder contains the Supabase schema, policies, seed data, and deployment scripts used by StreamCart. It is not a complete production commerce backend by itself; payment webhooks, payout execution, and live-video transport still require trusted provider integrations.

The frontend is deployed at [multi-vendor-ecommerce-ten.vercel.app](https://multi-vendor-ecommerce-ten.vercel.app/). The current repo state includes the full demo storefront, live-buy flows, vendor/admin consoles, AI-assisted commerce features, and the Supabase bridge for live auth/data. Apply migrations through 08 before using the updated live registration, checkout, order status, and payout flows. Migration 07 fixes recursive order RLS; migration 08 adds server-authoritative commerce operations and profile/vendor protections.

---

## 📁 Files Overview

| File | Purpose |
|---|---|
| [`apply_all_forward_migrations.sql`](apply_all_forward_migrations.sql) | **Master Upgrade Script for Existing Databases.** Fixes RLS recursion, creates storage buckets, creates notifications, installs atomic commerce RPCs, and configures Realtime in one run. |
| [`setup.sql`](setup.sql) | **Base setup script** (Schema + RLS + Storage + Realtime + RPC). Copy and paste this directly into the Supabase SQL Editor for new projects. |
| [`seed.sql`](seed.sql) | Comprehensive seed data (Categories, Vendors, Products, Shoppable Reels, Live Streams, Payouts, Disputes). |
| [`migrations/01_schema.sql`](migrations/01_schema.sql) | Core DDL tables, foreign key constraints, and automated counters triggers. |
| [`migrations/02_rls.sql`](migrations/02_rls.sql) | Bulletproof Row Level Security (RLS) policies for Customer, Vendor, and Admin isolation. |
| [`migrations/03_storage.sql`](migrations/03_storage.sql) | Storage buckets (`product-images`, `reels`, `avatars`) and file upload policies. |
| [`migrations/04_realtime.sql`](migrations/04_realtime.sql) | Realtime publication configuration for live chat, pinned products, and instant vendor order alerts. |
| [`migrations/05_rpc.sql`](migrations/05_rpc.sql) | Atomic stored procedures (`place_order_atomic`, `pin_stream_product`, `request_vendor_payout`, `adjust_stream_viewers`). |
| [`migrations/06_auth_order_hardening.sql`](migrations/06_auth_order_hardening.sql) | Signup role restrictions, customer-owned order inserts, and seeded vendor ownership backfill. |
| [`migrations/07_rls_recursion_fix.sql`](migrations/07_rls_recursion_fix.sql) | Replaces order policies and makes policy helpers RLS-independent to prevent `42P17` recursion. |
| [`migrations/08_backend_security_and_atomic_flows.sql`](migrations/08_backend_security_and_atomic_flows.sql) | Protects profile/vendor fields and adds atomic order, fulfillment, cancellation, payout, follow, dispute, and vendor-scoped Storage operations. |
| [`migrations/09_user_data_and_social_persistence.sql`](migrations/09_user_data_and_social_persistence.sql) | Adds authenticated cart, wishlist, reel, stream, conversation, and review RPCs. |
| [`migrations/10_production_security_hardening.sql`](migrations/10_production_security_hardening.sql) | Revokes unintended public RPC execution, constrains direct stream-message writes, adds length checks/indexes, and completes the production security boundary. |
| [`migrations/11_order_payments_notifications.sql`](migrations/11_order_payments_notifications.sql) | Adds secure mock-payment metadata/wrapper, notification storage/RLS, order notification triggers, and Realtime publication. |

---

## 🚀 Quick Setup Instructions

### For Existing Projects (Recommended)
If you already ran the initial tables or are connecting to your existing Supabase project (such as `https://llgyqsfxiokvmxqhztin.supabase.co`):
1. In your Supabase Dashboard, go to **SQL Editor** → **New Query**.
2. Copy and paste the entire contents of [`apply_all_forward_migrations.sql`](apply_all_forward_migrations.sql).
3. Click **Run** (Ctrl + Enter).
   > ✅ This immediately fixes RLS recursion on `orders`, creates the 3 storage buckets (`product-images`, `reels`, `avatars`), sets up `notifications`, and installs all atomic checkout and payout RPCs.

### For Completely New Projects
1. Go to [supabase.com](https://supabase.com) and create a project.
2. In the **SQL Editor**, run [`supabase/setup.sql`](setup.sql).
3. In a new tab, run [`supabase/apply_all_forward_migrations.sql`](apply_all_forward_migrations.sql).
4. Run [`supabase/seed.sql`](seed.sql) to populate initial mock vendors, products, and reels.

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

For an existing database, apply migrations 01 through 11 in order. The app does not run SQL migrations automatically. Migrations 10 and 11 must be applied before production traffic; migration 11 provides secure mock payment and persisted order notifications. Do not accept real money until the mock wrapper is replaced by a signed provider integration.

Migration 08 hardens `place_order_atomic`: it derives price, totals, coupon, and shipping from server-side records, locks inventory, and writes the order and items in one transaction. Live checkout currently supports COD only. Do not enable online payments until a trusted payment integration and verified webhook are deployed.

Migration 08 also creates a vendor's pending store in the `auth.users` trigger from signup metadata, so vendor registration remains complete when email confirmation is enabled. The frontend refreshes profile, vendor, order, and follow data after login. Password changes use Supabase Auth and verify the current password.

Migration 08 also protects profile roles/status and vendor approval, ownership, commission, and balance fields. Vendor payout reservation/rejection is transactional, but transfer to a bank or wallet remains an external manual operation. Do not place a Supabase service-role key in frontend configuration. Guest checkout is intentionally unsupported; order creation requires a matching Supabase Auth user.
