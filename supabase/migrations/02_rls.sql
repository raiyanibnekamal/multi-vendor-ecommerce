-- ==============================================================================
-- StreamCart - Row Level Security (RLS) Policies (02_rls.sql)
-- Full multi-tenant isolation: Admin, Vendor (scoped), and Customer boundaries
-- ==============================================================================

-- 1. HELPER SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.get_my_vendor_id()
RETURNS TEXT AS $$
  SELECT id FROM public.vendors WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

ALTER FUNCTION public.get_my_role() OWNER TO postgres;
ALTER FUNCTION public.get_my_vendor_id() OWNER TO postgres;
ALTER FUNCTION public.is_admin() OWNER TO postgres;

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
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_order_customer(p_order_id TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id AND customer_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

ALTER FUNCTION public.order_has_vendor_item(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.is_order_customer(TEXT, UUID) OWNER TO postgres;

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

DROP POLICY IF EXISTS "Customers or guests can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Customers or guests can insert order items" ON public.order_items;

CREATE POLICY "Authenticated customers can create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Authenticated customers can create own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.is_order_customer(order_items.order_id, auth.uid()));

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
