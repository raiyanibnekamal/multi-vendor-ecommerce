-- ==============================================================================
-- StreamCart: Master Forward Migration & Production Hardening Script
-- Apply this in the Supabase SQL Editor on your existing project:
-- https://llgyqsfxiokvmxqhztin.supabase.co (or your current project)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FIX ORDERS & ORDER_ITEMS RLS RECURSION (Eliminates Error 42P17)
-- ------------------------------------------------------------------------------

-- Ensure helper functions are plpgsql (never inlined by query planner)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.get_my_vendor_id()
RETURNS TEXT AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id FROM public.vendors WHERE owner_id = auth.uid() LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.order_has_vendor_item(p_order_id TEXT, p_vendor_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_order_id IS NULL OR p_vendor_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = p_order_id AND vendor_id = p_vendor_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_order_customer(p_order_id TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_order_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND customer_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' SET row_security = off;

ALTER FUNCTION public.get_my_role() OWNER TO postgres;
ALTER FUNCTION public.get_my_vendor_id() OWNER TO postgres;
ALTER FUNCTION public.is_admin() OWNER TO postgres;
ALTER FUNCTION public.order_has_vendor_item(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.is_order_customer(TEXT, UUID) OWNER TO postgres;

-- Drop all conflicting old policies on orders and order_items
DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('orders', 'order_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END;
$$;

-- Non-recursive clean policies for orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR public.order_has_vendor_item(orders.id, public.get_my_vendor_id())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to orders"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Non-recursive clean policies for order_items
CREATE POLICY "Order items viewable by customer, vendor or admin"
  ON public.order_items FOR SELECT
  USING (
    vendor_id = public.get_my_vendor_id()
    OR public.is_order_customer(order_items.order_id, auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to order_items"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. CREATE STORAGE BUCKETS AND POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('reels', 'reels', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read: product-images" ON storage.objects;
CREATE POLICY "Public Read: product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated Upload: product-images" ON storage.objects;
CREATE POLICY "Authenticated Upload: product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public Read: reels" ON storage.objects;
CREATE POLICY "Public Read: reels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

DROP POLICY IF EXISTS "Authenticated Upload: reels" ON storage.objects;
CREATE POLICY "Authenticated Upload: reels"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reels' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public Read: avatars" ON storage.objects;
CREATE POLICY "Public Read: avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated Upload: avatars" ON storage.objects;
CREATE POLICY "Authenticated Upload: avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 3. ORDERS TABLE PAYMENT METADATA & ORDER CONSTRAINTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_provider_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_provider_check
  CHECK (payment_provider IN ('cod', 'mock', 'bkash', 'nagad', 'card'));

-- ------------------------------------------------------------------------------
-- 4. NOTIFICATIONS TABLE, RLS & TRIGGERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('customer', 'vendor', 'admin')),
  type TEXT NOT NULL CHECK (type IN ('order_created', 'order_updated', 'payment_updated')),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 500),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_order
  ON public.notifications(order_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Triggers for automatic order notification
CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.notifications(recipient_id, recipient_role, type, order_id, title, body, data)
    SELECT NEW.customer_id, 'customer', 'order_created', NEW.id, 'Order placed',
      'Your order ' || NEW.id || ' was placed successfully.', jsonb_build_object('status', NEW.status);
  END IF;

  INSERT INTO public.notifications(recipient_id, recipient_role, type, order_id, title, body, data)
  SELECT p.id, 'admin', 'order_created', NEW.id, 'New order received',
    'Order ' || NEW.id || ' needs fulfilment review.', jsonb_build_object('status', NEW.status)
  FROM public.profiles AS p
  WHERE p.role = 'admin' AND p.status = 'active';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_order_item_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  INSERT INTO public.notifications(recipient_id, recipient_role, type, order_id, title, body, data)
  SELECT v.owner_id, 'vendor', 'order_created', NEW.order_id, 'New order for your store',
    'Order ' || NEW.order_id || ' includes ' || NEW.title || '.', jsonb_build_object('productId', NEW.product_id, 'qty', NEW.qty)
  FROM public.vendors AS v
  WHERE v.id = NEW.vendor_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_order_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO public.notifications(recipient_id, recipient_role, type, order_id, title, body, data)
      SELECT NEW.customer_id, 'customer',
        CASE WHEN NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN 'payment_updated' ELSE 'order_updated' END,
        NEW.id, 'Order updated', 'Order ' || NEW.id || ' is now ' || NEW.status || '.',
        jsonb_build_object('status', NEW.status, 'paymentStatus', NEW.payment_status);
    END IF;

    INSERT INTO public.notifications(recipient_id, recipient_role, type, order_id, title, body, data)
    SELECT DISTINCT v.owner_id, 'vendor', 'order_updated', NEW.id, 'Order status updated',
      'Order ' || NEW.id || ' is now ' || NEW.status || '.', jsonb_build_object('status', NEW.status)
    FROM public.order_items AS oi
    JOIN public.vendors AS v ON v.id = oi.vendor_id
    WHERE oi.order_id = NEW.id;

    INSERT INTO public.notifications(recipient_id, recipient_role, type, order_id, title, body, data)
    SELECT p.id, 'admin', 'order_updated', NEW.id, 'Order status updated',
      'Order ' || NEW.id || ' is now ' || NEW.status || '.', jsonb_build_object('status', NEW.status)
    FROM public.profiles AS p
    WHERE p.role = 'admin' AND p.status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_order_created_trigger ON public.orders;
CREATE TRIGGER notify_order_created_trigger
  AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_created();

DROP TRIGGER IF EXISTS notify_order_updated_trigger ON public.orders;
CREATE TRIGGER notify_order_updated_trigger
  AFTER UPDATE OF status, payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_updated();

DROP TRIGGER IF EXISTS notify_order_item_created_trigger ON public.order_items;
CREATE TRIGGER notify_order_item_created_trigger
  AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.notify_order_item_created();

-- ------------------------------------------------------------------------------
-- 5. ATOMIC COMMERCE STORED PROCEDURES
-- ------------------------------------------------------------------------------

-- A. place_order_atomic
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_order_id TEXT,
  p_items JSONB,
  p_address JSONB,
  p_subtotal NUMERIC,
  p_shipping NUMERIC,
  p_discount NUMERIC,
  p_coupon TEXT,
  p_payment_method TEXT,
  p_source TEXT DEFAULT 'store',
  p_source_ref_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_name TEXT;
  v_requested RECORD;
  v_product public.products%ROWTYPE;
  v_calculated_subtotal NUMERIC := 0;
  v_calculated_shipping NUMERIC := 60;
  v_calculated_discount NUMERIC := 0;
  v_calculated_total NUMERIC := 0;
  v_created_order public.orders%ROWTYPE;
  v_items_result JSONB := '[]'::jsonb;
  v_products_result JSONB := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place orders.';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart cannot be empty.';
  END IF;

  SELECT name INTO v_customer_name FROM public.profiles WHERE id = v_user_id;

  -- Lock and validate inventory
  FOR v_requested IN
    SELECT (value->>'productId')::TEXT AS product_id, (value->>'qty')::INTEGER AS qty
    FROM jsonb_array_elements(p_items)
  LOOP
    IF v_requested.qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_requested.product_id;
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_requested.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found.', v_requested.product_id;
    END IF;

    IF v_product.stock < v_requested.qty THEN
      RAISE EXCEPTION 'Insufficient stock for product "%" (Available: %, Requested: %)',
        v_product.title, v_product.stock, v_requested.qty;
    END IF;

    v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_requested.qty);
  END LOOP;

  -- Calculate shipping and coupons
  IF v_calculated_subtotal >= 2000 THEN
    v_calculated_shipping := 0;
  END IF;

  IF p_coupon = 'STREAM10' THEN
    v_calculated_discount := LEAST(500, ROUND(v_calculated_subtotal * 0.10));
  ELSIF p_coupon = 'LIVE50' THEN
    v_calculated_discount := 50;
  END IF;

  v_calculated_total := v_calculated_subtotal + v_calculated_shipping - v_calculated_discount;

  -- Insert order
  INSERT INTO public.orders (
    id, customer_id, customer_name, subtotal, shipping, discount,
    coupon, total, status, payment_method, payment_status, payment_provider,
    source, address
  ) VALUES (
    p_order_id, v_user_id, COALESCE(v_customer_name, 'Customer'),
    v_calculated_subtotal, v_calculated_shipping, v_calculated_discount,
    CASE WHEN v_calculated_discount > 0 THEN p_coupon ELSE NULL END,
    v_calculated_total, 'pending', p_payment_method,
    CASE WHEN p_payment_method = 'cod' THEN 'unpaid' ELSE 'paid' END,
    CASE WHEN p_payment_method = 'cod' THEN 'cod' ELSE 'mock' END,
    COALESCE(p_source, 'store'), p_address
  )
  RETURNING * INTO v_created_order;

  -- Insert order items & deduct stock
  FOR v_requested IN
    SELECT (value->>'productId')::TEXT AS product_id, (value->>'qty')::INTEGER AS qty
    FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_requested.product_id;

    INSERT INTO public.order_items (
      order_id, product_id, vendor_id, title, thumbnail, price, qty, status
    ) VALUES (
      p_order_id, v_product.id, v_product.vendor_id, v_product.title,
      v_product.thumbnail, v_product.price, v_requested.qty, 'pending'
    );

    UPDATE public.products
    SET stock = stock - v_requested.qty,
        sold = sold + v_requested.qty
    WHERE id = v_product.id
    RETURNING * INTO v_product;

    v_products_result := v_products_result || jsonb_build_object(
      'id', v_product.id,
      'stock', v_product.stock,
      'sold', v_product.sold
    );
  END LOOP;

  SELECT jsonb_agg(to_jsonb(oi)) INTO v_items_result
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_created_order),
    'items', v_items_result,
    'products', v_products_result
  );
END;
$$;

-- B. place_order_mock_payment
CREATE OR REPLACE FUNCTION public.place_order_mock_payment(
  p_order_id TEXT,
  p_items JSONB,
  p_address JSONB,
  p_subtotal NUMERIC,
  p_shipping NUMERIC,
  p_discount NUMERIC,
  p_coupon TEXT,
  p_payment_method TEXT,
  p_source TEXT DEFAULT 'store',
  p_source_ref_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_order public.orders%ROWTYPE;
BEGIN
  IF p_payment_method NOT IN ('card', 'bkash', 'nagad') THEN
    RAISE EXCEPTION 'Invalid mock payment method.';
  END IF;

  v_result := public.place_order_atomic(
    p_order_id, p_items, p_address, p_subtotal, p_shipping, p_discount,
    p_coupon, 'cod', p_source, p_source_ref_id
  );

  UPDATE public.orders
  SET payment_method = p_payment_method,
      payment_status = 'paid',
      payment_provider = 'mock',
      payment_reference = 'MOCK-' || replace(gen_random_uuid()::text, '-', '')
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_set(v_result, '{order}', to_jsonb(v_order));
END;
$$;

-- C. update_vendor_order_status
CREATE OR REPLACE FUNCTION public.update_vendor_order_status(
  p_order_id TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vendor_id TEXT := public.get_my_vendor_id();
  v_order public.orders%ROWTYPE;
  v_items JSONB;
  v_all_delivered BOOLEAN;
  v_any_processing BOOLEAN;
BEGIN
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor profile required.';
  END IF;

  IF p_status NOT IN ('processing', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status.';
  END IF;

  UPDATE public.order_items
  SET status = p_status
  WHERE order_id = p_order_id AND vendor_id = v_vendor_id;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  SELECT bool_and(status = 'delivered') INTO v_all_delivered FROM public.order_items WHERE order_id = p_order_id;
  SELECT bool_or(status IN ('processing', 'shipped')) INTO v_any_processing FROM public.order_items WHERE order_id = p_order_id;

  IF v_all_delivered THEN
    UPDATE public.orders SET status = 'delivered', payment_status = 'paid' WHERE id = p_order_id RETURNING * INTO v_order;
  ELSIF v_any_processing THEN
    UPDATE public.orders SET status = 'processing' WHERE id = p_order_id RETURNING * INTO v_order;
  END IF;

  SELECT jsonb_agg(to_jsonb(oi)) INTO v_items FROM public.order_items oi WHERE oi.order_id = p_order_id;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_items,
    'vendor_balance', (SELECT balance FROM public.vendors WHERE id = v_vendor_id)
  );
END;
$$;

-- D. admin_update_order_status
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required.';
  END IF;

  UPDATE public.orders
  SET status = p_status,
      payment_status = CASE WHEN p_status = 'delivered' THEN 'paid' WHEN p_status = 'cancelled' THEN 'refunded' ELSE payment_status END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  UPDATE public.order_items SET status = p_status WHERE order_id = p_order_id;

  SELECT jsonb_agg(to_jsonb(oi)) INTO v_items FROM public.order_items oi WHERE oi.order_id = p_order_id;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_items
  );
END;
$$;

-- E. cancel_my_order
CREATE OR REPLACE FUNCTION public.cancel_my_order(
  p_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items JSONB;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order.customer_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized.'; END IF;
  IF v_order.status NOT IN ('pending', 'processing') THEN RAISE EXCEPTION 'Order cannot be cancelled in status %', v_order.status; END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE 'unpaid' END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Restore product stock
  FOR v_item IN SELECT product_id, qty FROM public.order_items WHERE order_id = p_order_id LOOP
    UPDATE public.products SET stock = stock + v_item.qty, sold = GREATEST(0, sold - v_item.qty) WHERE id = v_item.product_id;
  END LOOP;

  UPDATE public.order_items SET status = 'cancelled' WHERE order_id = p_order_id;
  SELECT jsonb_agg(to_jsonb(oi)) INTO v_items FROM public.order_items oi WHERE oi.order_id = p_order_id;

  RETURN jsonb_build_object('order', to_jsonb(v_order), 'items', v_items);
END;
$$;

-- F. request_vendor_payout
CREATE OR REPLACE FUNCTION public.request_vendor_payout(
  p_amount NUMERIC,
  p_method TEXT,
  p_account_info JSONB,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vendor_id TEXT := public.get_my_vendor_id();
  v_vendor public.vendors%ROWTYPE;
  v_payout public.payouts%ROWTYPE;
BEGIN
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'Vendor profile required.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_vendor_id FOR UPDATE;

  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum payout is ৳1000.'; END IF;
  IF v_vendor.balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance.'; END IF;

  UPDATE public.vendors SET balance = balance - p_amount WHERE id = v_vendor_id RETURNING * INTO v_vendor;

  INSERT INTO public.payouts (
    vendor_id, amount, method, account_info, status, note
  ) VALUES (
    v_vendor_id, p_amount, p_method, p_account_info, 'pending', p_note
  ) RETURNING * INTO v_payout;

  RETURN jsonb_build_object(
    'payout', to_jsonb(v_payout),
    'vendor_balance', v_vendor.balance
  );
END;
$$;

-- G. admin_update_payout_status
CREATE OR REPLACE FUNCTION public.admin_update_payout_status(
  p_payout_id TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
  v_vendor public.vendors%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required.'; END IF;
  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found.'; END IF;

  IF p_status = 'rejected' AND v_payout.status != 'rejected' THEN
    UPDATE public.vendors SET balance = balance + v_payout.amount WHERE id = v_payout.vendor_id RETURNING * INTO v_vendor;
  ELSE
    SELECT * INTO v_vendor FROM public.vendors WHERE id = v_payout.vendor_id;
  END IF;

  UPDATE public.payouts
  SET status = p_status,
      processed_at = CASE WHEN p_status = 'paid' THEN now() ELSE processed_at END
  WHERE id = p_payout_id
  RETURNING * INTO v_payout;

  RETURN jsonb_build_object(
    'payout', to_jsonb(v_payout),
    'vendor_balance', v_vendor.balance
  );
END;
$$;

-- H. toggle_vendor_follow
CREATE OR REPLACE FUNCTION public.toggle_vendor_follow(
  p_vendor_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_followers INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.follows WHERE user_id = v_user_id AND vendor_id = p_vendor_id) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.follows WHERE user_id = v_user_id AND vendor_id = p_vendor_id;
    UPDATE public.vendors SET followers = GREATEST(0, followers - 1) WHERE id = p_vendor_id RETURNING followers INTO v_followers;
    RETURN jsonb_build_object('following', false, 'followers', v_followers);
  ELSE
    INSERT INTO public.follows (user_id, vendor_id) VALUES (v_user_id, p_vendor_id) ON CONFLICT DO NOTHING;
    UPDATE public.vendors SET followers = followers + 1 WHERE id = p_vendor_id RETURNING followers INTO v_followers;
    RETURN jsonb_build_object('following', true, 'followers', v_followers);
  END IF;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.place_order_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order_mock_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vendor_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_vendor_payout TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payout_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_vendor_follow TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  pub_tables TEXT[] := ARRAY['orders', 'order_items', 'products', 'live_streams', 'stream_messages', 'notifications'];
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY pub_tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN OTHERS THEN
          -- Ignore if table doesn't support publication or already added
        END;
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
