-- ==============================================================================
-- StreamCart - Comprehensive Supabase PostgreSQL Schema (01_schema.sql)
-- Production Ready: Relational Integrity, Check Constraints, Automatic Triggers
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin')),
  vendor_id TEXT, -- Populated if role is vendor
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
  addresses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. VENDORS (Stores)
CREATE TABLE IF NOT EXISTS public.vendors (
  id TEXT PRIMARY KEY DEFAULT ('v_' || replace(gen_random_uuid()::text, '-', '')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT DEFAULT 'Dhaka',
  color TEXT DEFAULT '#2563eb',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected', 'blocked')),
  verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  followers INTEGER DEFAULT 0 CHECK (followers >= 0),
  commission_rate NUMERIC(5,2) DEFAULT 10.0 CHECK (commission_rate >= 0),
  balance NUMERIC(12,2) DEFAULT 0.0 CHECK (balance >= 0),
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Link vendor_id in profiles as foreign key (optional circular safeguard)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS fk_profiles_vendor;
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_vendor 
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

-- 5. CATEGORIES (Self-referencing tree)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT ('p_' || replace(gen_random_uuid()::text, '-', '')),
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  brand TEXT,
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(12,2) CHECK (original_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sold INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'out_of_stock')),
  thumbnail TEXT,
  images TEXT[] DEFAULT '{}'::text[],
  tags TEXT[] DEFAULT '{}'::text[],
  rating NUMERIC(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON public.products USING gin (title gin_trgm_ops);

CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. REELS (Shoppable Short Videos)
CREATE TABLE IF NOT EXISTS public.reels (
  id TEXT PRIMARY KEY DEFAULT ('r_' || replace(gen_random_uuid()::text, '-', '')),
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  poster_url TEXT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  saves INTEGER DEFAULT 0 CHECK (saves >= 0),
  shares INTEGER DEFAULT 0 CHECK (shares >= 0),
  comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
  status_moderation TEXT DEFAULT 'ok',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reels_vendor ON public.reels(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reels_status ON public.reels(status);

CREATE TRIGGER set_reels_updated_at
BEFORE UPDATE ON public.reels
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. REEL PRODUCTS (Tagging products in reels)
CREATE TABLE IF NOT EXISTS public.reel_products (
  reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (reel_id, product_id)
);

-- 9. REEL INTERACTIONS (Likes, Saves, Comments)
CREATE TABLE IF NOT EXISTS public.reel_likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, reel_id)
);

CREATE TABLE IF NOT EXISTS public.reel_saves (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, reel_id)
);

CREATE TABLE IF NOT EXISTS public.reel_comments (
  id TEXT PRIMARY KEY DEFAULT ('rc_' || replace(gen_random_uuid()::text, '-', '')),
  reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel ON public.reel_comments(reel_id);

-- 10. LIVE STREAMS
CREATE TABLE IF NOT EXISTS public.live_streams (
  id TEXT PRIMARY KEY DEFAULT ('s_' || replace(gen_random_uuid()::text, '-', '')),
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  video_url TEXT,
  thumbnail TEXT,
  pinned_product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  viewers INTEGER DEFAULT 0 CHECK (viewers >= 0),
  peak_viewers INTEGER DEFAULT 0 CHECK (peak_viewers >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  status_moderation TEXT DEFAULT 'ok',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_vendor ON public.live_streams(vendor_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);

CREATE TRIGGER set_live_streams_updated_at
BEFORE UPDATE ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. STREAM PRODUCTS & MESSAGES
CREATE TABLE IF NOT EXISTS public.stream_products (
  stream_id TEXT NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (stream_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.stream_messages (
  id TEXT PRIMARY KEY DEFAULT ('sm_' || replace(gen_random_uuid()::text, '-', '')),
  stream_id TEXT NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_vendor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_messages_stream ON public.stream_messages(stream_id);

-- 12. CARTS & WISHLISTS
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- 13. ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.0 CHECK (subtotal >= 0),
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0.0 CHECK (shipping >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0.0 CHECK (discount >= 0),
  coupon TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0.0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'card', 'bkash', 'nagad')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  source TEXT NOT NULL DEFAULT 'store' CHECK (source IN ('store', 'reel', 'live')),
  source_ref_id TEXT,
  address JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT ('oi_' || replace(gen_random_uuid()::text, '-', '')),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  thumbnail TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  qty INTEGER NOT NULL CHECK (qty > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_vendor ON public.order_items(vendor_id);

-- 14. PAYOUTS & DISPUTES
CREATE TABLE IF NOT EXISTS public.payouts (
  id TEXT PRIMARY KEY DEFAULT ('po_' || replace(gen_random_uuid()::text, '-', '')),
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'bank',
  account_info JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
  note TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.disputes (
  id TEXT PRIMARY KEY DEFAULT ('disp_' || replace(gen_random_uuid()::text, '-', '')),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY DEFAULT ('conv_' || replace(gen_random_uuid()::text, '-', '')),
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_id, customer_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY DEFAULT ('msg_' || replace(gen_random_uuid()::text, '-', '')),
  conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_role TEXT NOT NULL CHECK (from_role IN ('vendor', 'customer')),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. FOLLOWS & REVIEWS
CREATE TABLE IF NOT EXISTS public.follows (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY DEFAULT ('rev_' || replace(gen_random_uuid()::text, '-', '')),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AUTOMATED USER REGISTRATION TRIGGER (auth.users -> public.profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. AUTOMATED COUNTER TRIGGERS
-- Reel Likes Counter Trigger
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET likes = likes + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET likes = GREATEST(0, likes - 1) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reel_likes_count ON public.reel_likes;
CREATE TRIGGER tr_reel_likes_count
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

-- Reel Saves Counter Trigger
CREATE OR REPLACE FUNCTION update_reel_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET saves = saves + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET saves = GREATEST(0, saves - 1) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reel_saves_count ON public.reel_saves;
CREATE TRIGGER tr_reel_saves_count
AFTER INSERT OR DELETE ON public.reel_saves
FOR EACH ROW EXECUTE FUNCTION update_reel_saves_count();

-- Reel Comments Counter Trigger
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reel_comments_count ON public.reel_comments;
CREATE TRIGGER tr_reel_comments_count
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

-- Vendor Followers Counter Trigger
CREATE OR REPLACE FUNCTION update_vendor_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.vendors SET followers = followers + 1 WHERE id = NEW.vendor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.vendors SET followers = GREATEST(0, followers - 1) WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_vendor_followers_count ON public.follows;
CREATE TRIGGER tr_vendor_followers_count
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION update_vendor_followers_count();


-- ==============================================================================
-- StreamCart - Row Level Security (RLS) Policies (02_rls.sql)
-- Full multi-tenant isolation: Admin, Vendor (scoped), and Customer boundaries
-- ==============================================================================

-- 1. HELPER SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_vendor_id()
RETURNS TEXT AS $$
  SELECT id FROM public.vendors WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- 4. VENDORS POLICIES
CREATE POLICY "Approved vendors are viewable by everyone"
  ON public.vendors FOR SELECT
  USING (status = 'approved' OR owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Vendors can update own store details"
  ON public.vendors FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins have full access to vendors"
  ON public.vendors FOR ALL
  USING (public.is_admin());

-- 5. CATEGORIES POLICIES
CREATE POLICY "Categories viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- 6. PRODUCTS POLICIES
CREATE POLICY "Active products viewable by everyone"
  ON public.products FOR SELECT
  USING (
    status = 'active' 
    OR vendor_id = public.get_my_vendor_id() 
    OR public.is_admin()
  );

CREATE POLICY "Vendors can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Vendors can update own products"
  ON public.products FOR UPDATE
  USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Vendors can delete own products"
  ON public.products FOR DELETE
  USING (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Admins have full access to products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- 7. REELS & REEL PRODUCTS POLICIES
CREATE POLICY "Approved reels viewable by everyone"
  ON public.reels FOR SELECT
  USING (
    status = 'approved' 
    OR vendor_id = public.get_my_vendor_id() 
    OR public.is_admin()
  );

CREATE POLICY "Vendors can insert own reels"
  ON public.reels FOR INSERT
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Vendors can update own reels"
  ON public.reels FOR UPDATE
  USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Vendors can delete own reels"
  ON public.reels FOR DELETE
  USING (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Admins have full access to reels"
  ON public.reels FOR ALL
  USING (public.is_admin());

CREATE POLICY "Reel products viewable by everyone"
  ON public.reel_products FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage tagged products in own reels"
  ON public.reel_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.reels 
      WHERE id = reel_products.reel_id AND vendor_id = public.get_my_vendor_id()
    ) OR public.is_admin()
  );

-- 8. REEL INTERACTIONS (Likes, Saves, Comments)
CREATE POLICY "Reel interactions viewable by everyone"
  ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Reel saves viewable by owner"
  ON public.reel_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Reel comments viewable by everyone"
  ON public.reel_comments FOR SELECT USING (true);

CREATE POLICY "Users can like/unlike reels"
  ON public.reel_likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can save/unsave reels"
  ON public.reel_saves FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can add comments"
  ON public.reel_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users or Admins can delete comments"
  ON public.reel_comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- 9. LIVE STREAMS & STREAM PRODUCTS/MESSAGES
CREATE POLICY "Live streams viewable by everyone"
  ON public.live_streams FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage own live streams"
  ON public.live_streams FOR ALL
  USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Stream products viewable by everyone"
  ON public.stream_products FOR SELECT USING (true);

CREATE POLICY "Vendors can manage stream products"
  ON public.stream_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams 
      WHERE id = stream_products.stream_id AND vendor_id = public.get_my_vendor_id()
    ) OR public.is_admin()
  );

CREATE POLICY "Stream messages viewable by everyone"
  ON public.stream_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post stream messages"
  ON public.stream_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 10. CARTS & WISHLISTS
CREATE POLICY "Users can manage own cart"
  ON public.carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 11. ORDERS & ORDER ITEMS
CREATE OR REPLACE FUNCTION public.order_has_vendor_item(p_order_id TEXT, p_vendor_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items 
    WHERE order_id = p_order_id AND vendor_id = p_vendor_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_order_customer(p_order_id TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id AND customer_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR public.order_has_vendor_item(orders.id, public.get_my_vendor_id())
    OR public.is_admin()
  );

CREATE POLICY "Order items viewable by customer, vendor or admin"
  ON public.order_items FOR SELECT
  USING (
    vendor_id = public.get_my_vendor_id()
    OR public.is_order_customer(order_items.order_id, auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Vendors can update status of own order items"
  ON public.order_items FOR UPDATE
  USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Admins have full access to orders and items"
  ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to order_items"
  ON public.order_items FOR ALL USING (public.is_admin());

-- 12. PAYOUTS & DISPUTES
CREATE POLICY "Vendors can view and request own payouts"
  ON public.payouts FOR ALL
  USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL USING (public.is_admin());

CREATE POLICY "Customers and Vendors can view relevant disputes"
  ON public.disputes FOR SELECT
  USING (
    customer_id = auth.uid() 
    OR vendor_id = public.get_my_vendor_id() 
    OR public.is_admin()
  );

CREATE POLICY "Customers can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can manage disputes"
  ON public.disputes FOR ALL USING (public.is_admin());

-- 13. CONVERSATIONS & MESSAGES
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    customer_id = auth.uid() 
    OR vendor_id = public.get_my_vendor_id() 
    OR public.is_admin()
  );

CREATE POLICY "Participants can view and send messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.customer_id = auth.uid() OR c.vendor_id = public.get_my_vendor_id() OR public.is_admin())
    )
  );

-- 14. FOLLOWS & REVIEWS
CREATE POLICY "Follows viewable by everyone"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows"
  ON public.follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ==============================================================================
-- StreamCart - Storage Buckets & Access Policies (03_storage.sql)
-- Product images, Shoppable reel videos, User avatars
-- ==============================================================================

-- 1. CREATE STORAGE BUCKETS (If not exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('reels', 'reels', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. STORAGE POLICIES
-- A. Product Images
CREATE POLICY "Public Read: product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Vendor Upload: product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' 
    AND (auth.role() = 'authenticated')
  );

CREATE POLICY "Vendor Manage: product-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

CREATE POLICY "Vendor Delete: product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- B. Reels (Videos & Posters)
CREATE POLICY "Public Read: reels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

CREATE POLICY "Vendor Upload: reels"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reels' 
    AND (auth.role() = 'authenticated')
  );

CREATE POLICY "Vendor Delete: reels"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reels' AND auth.uid() = owner);

-- C. Avatars
CREATE POLICY "Public Read: avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "User Upload: avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (auth.role() = 'authenticated')
  );

CREATE POLICY "User Manage: avatars"
  ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND auth.uid() = owner);


-- ==============================================================================
-- StreamCart - Realtime Replication Setup (04_realtime.sql)
-- Real-time order sync, live stream chat & pinned products
-- ==============================================================================

-- 1. SET REPLICA IDENTITY (Allows real-time updates to receive full old and new rows)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.live_streams REPLICA IDENTITY FULL;
ALTER TABLE public.stream_messages REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 2. ADD TABLES TO SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'live_streams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stream_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;


-- ==============================================================================
-- StreamCart - Stored Procedures & Business Logic RPC (05_rpc.sql)
-- Atomic transactions: Checkout, Stock deduction, Live product pinning, Payouts
-- ==============================================================================

-- 1. ATOMIC ORDER PLACEMENT
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_order_id TEXT,
  p_items JSONB,              -- Array of { productId, vendorId, title, thumbnail, price, qty }
  p_address JSONB,
  p_subtotal NUMERIC,
  p_shipping NUMERIC,
  p_discount NUMERIC,
  p_coupon TEXT,
  p_payment_method TEXT,
  p_source TEXT DEFAULT 'store',
  p_source_ref_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_name TEXT;
  v_item JSONB;
  v_product RECORD;
  v_total NUMERIC;
  v_order RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to place an order.';
  END IF;

  SELECT name INTO v_customer_name FROM public.profiles WHERE id = v_user_id;
  v_total := p_subtotal + p_shipping - p_discount;

  -- Verify stock for each item & deduct atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM public.products 
    WHERE id = (v_item->>'productId') FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % does not exist.', (v_item->>'title');
    END IF;

    IF v_product.stock < (v_item->>'qty')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for product: % (Available: %)', v_product.title, v_product.stock;
    END IF;

    -- Deduct stock & increment sold
    UPDATE public.products 
    SET stock = stock - (v_item->>'qty')::INTEGER,
        sold = sold + (v_item->>'qty')::INTEGER
    WHERE id = v_product.id;
  END LOOP;

  -- Create Order Header
  INSERT INTO public.orders (
    id, customer_id, customer_name, subtotal, shipping, discount, coupon, total,
    status, payment_method, payment_status, source, source_ref_id, address
  ) VALUES (
    p_order_id, v_user_id, COALESCE(v_customer_name, 'Customer'), p_subtotal, p_shipping, p_discount, p_coupon, v_total,
    'pending', p_payment_method, CASE WHEN p_payment_method = 'cod' THEN 'unpaid' ELSE 'paid' END,
    p_source, p_source_ref_id, p_address
  ) RETURNING * INTO v_order;

  -- Insert Order Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (
      order_id, product_id, vendor_id, title, thumbnail, price, qty, status
    ) VALUES (
      p_order_id,
      v_item->>'productId',
      v_item->>'vendorId',
      v_item->>'title',
      v_item->>'thumbnail',
      (v_item->>'price')::NUMERIC,
      (v_item->>'qty')::INTEGER,
      'pending'
    );

    -- Credit vendor balance if paid online
    IF p_payment_method != 'cod' THEN
      UPDATE public.vendors
      SET balance = balance + ((v_item->>'price')::NUMERIC * (v_item->>'qty')::INTEGER * (1 - (commission_rate / 100.0)))
      WHERE id = (v_item->>'vendorId');
    END IF;

    -- Clear from user's cart
    DELETE FROM public.carts 
    WHERE user_id = v_user_id AND product_id = (v_item->>'productId');
  END LOOP;

  RETURN to_jsonb(v_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PIN PRODUCT IN LIVE STREAM
CREATE OR REPLACE FUNCTION public.pin_stream_product(
  p_stream_id TEXT,
  p_product_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_vendor_id TEXT := public.get_my_vendor_id();
BEGIN
  IF v_vendor_id IS NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only vendor owner can pin products.';
  END IF;

  UPDATE public.live_streams 
  SET pinned_product_id = p_product_id
  WHERE id = p_stream_id AND (vendor_id = v_vendor_id OR public.is_admin());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REQUEST VENDOR PAYOUT
CREATE OR REPLACE FUNCTION public.request_vendor_payout(
  p_amount NUMERIC,
  p_method TEXT,
  p_account_info JSONB,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vendor_id TEXT := public.get_my_vendor_id();
  v_vendor RECORD;
  v_payout RECORD;
BEGIN
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor profile not found.';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_vendor_id FOR UPDATE;

  IF v_vendor.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance (Current balance: %)', v_vendor.balance;
  END IF;

  -- Deduct balance
  UPDATE public.vendors 
  SET balance = balance - p_amount 
  WHERE id = v_vendor_id;

  -- Create payout request
  INSERT INTO public.payouts (
    vendor_id, amount, method, account_info, status, note
  ) VALUES (
    v_vendor_id, p_amount, p_method, p_account_info, 'pending', p_note
  ) RETURNING * INTO v_payout;

  RETURN to_jsonb(v_payout);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. LIVE STREAM VIEWER TRACKER
CREATE OR REPLACE FUNCTION public.adjust_stream_viewers(
  p_stream_id TEXT,
  p_delta INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_current INTEGER;
BEGIN
  UPDATE public.live_streams
  SET viewers = GREATEST(0, viewers + p_delta),
      peak_viewers = GREATEST(peak_viewers, viewers + p_delta)
  WHERE id = p_stream_id
  RETURNING viewers INTO v_current;

  RETURN v_current;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
