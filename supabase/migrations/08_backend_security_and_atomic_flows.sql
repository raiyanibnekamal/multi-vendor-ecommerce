-- Secure profile/vendor writes and move commerce mutations behind checked RPCs.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.guard_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') OR auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only an admin may change profile role or status.';
  END IF;

  IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
    IF OLD.vendor_id IS NOT NULL
      OR NEW.vendor_id IS NULL
      OR NEW.role <> 'vendor'
      OR NOT EXISTS (
        SELECT 1 FROM public.vendors
        WHERE id = NEW.vendor_id AND owner_id = auth.uid()
      ) THEN
      RAISE EXCEPTION 'Profile vendor link is not permitted.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_profile_security_fields() OWNER TO postgres;
DROP TRIGGER IF EXISTS guard_profile_security_fields ON public.profiles;
CREATE TRIGGER guard_profile_security_fields
  BEFORE UPDATE OF role, status, vendor_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_security_fields();

CREATE OR REPLACE FUNCTION public.guard_vendor_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') OR auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_id IS DISTINCT FROM auth.uid()
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'vendor'
      ) THEN
      RAISE EXCEPTION 'Only the authenticated vendor may create their store.';
    END IF;
    NEW.status := 'pending';
    NEW.verified := FALSE;
    NEW.rating := 0;
    NEW.followers := 0;
    NEW.commission_rate := 10;
    NEW.balance := 0;
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.verified IS DISTINCT FROM OLD.verified
    OR NEW.rating IS DISTINCT FROM OLD.rating
    OR NEW.followers IS DISTINCT FROM OLD.followers
    OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
    OR NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'Only an admin or trusted backend may change protected vendor fields.';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_vendor_security_fields() OWNER TO postgres;
DROP TRIGGER IF EXISTS guard_vendor_security_fields ON public.vendors;
CREATE TRIGGER guard_vendor_security_fields
  BEFORE INSERT OR UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_security_fields();

DROP POLICY IF EXISTS "Vendors can register own store" ON public.vendors;
CREATE POLICY "Vendors can register own store"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND status = 'pending'
    AND verified = FALSE
    AND commission_rate = 10
    AND balance = 0
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := CASE WHEN NEW.raw_user_meta_data->>'role' = 'vendor' THEN 'vendor' ELSE 'customer' END;
  v_store_name TEXT := nullif(trim(NEW.raw_user_meta_data->>'storeName'), '');
  v_vendor_id TEXT;
  v_slug TEXT;
  v_name TEXT := coalesce(nullif(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1));
  v_phone TEXT := nullif(trim(NEW.raw_user_meta_data->>'phone'), '');
BEGIN
  IF v_role = 'vendor' AND v_store_name IS NULL THEN
    RAISE EXCEPTION 'A store name is required for vendor registration.';
  END IF;

  INSERT INTO public.profiles (id, email, name, role, phone, avatar_url)
  VALUES (
    NEW.id, NEW.email, v_name, v_role, v_phone,
    nullif(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = coalesce(EXCLUDED.name, public.profiles.name);

  IF v_role = 'vendor' THEN
    SELECT id INTO v_vendor_id FROM public.vendors WHERE owner_id = NEW.id LIMIT 1;
    IF v_vendor_id IS NULL THEN
      v_vendor_id := 'v_' || replace(gen_random_uuid()::text, '-', '');
      v_slug := trim(regexp_replace(lower(v_store_name), '[^a-z0-9]+', '-', 'g'), '-')
        || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      INSERT INTO public.vendors (
        id, owner_id, name, slug, owner_name, email, phone, location, color,
        description, status, verified, rating, followers, commission_rate, balance
      ) VALUES (
        v_vendor_id, NEW.id, v_store_name, v_slug, v_name, NEW.email, v_phone,
        'Dhaka', '#2563eb',
        v_store_name || ' - ' || coalesce(nullif(trim(NEW.raw_user_meta_data->>'storeCategory'), ''), 'General store'),
        'pending', FALSE, 0, 0, 10, 0
      );
    END IF;
    UPDATE public.profiles SET vendor_id = v_vendor_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Replace direct client order writes with one server-priced, stock-locked RPC.
DROP POLICY IF EXISTS "Authenticated customers can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated customers can create own order items" ON public.order_items;
DROP POLICY IF EXISTS "Vendors can update status of own order items" ON public.order_items;

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
  v_order public.orders%ROWTYPE;
  v_item JSONB;
  v_order_items JSONB := '[]'::jsonb;
  v_products JSONB := '[]'::jsonb;
  v_subtotal NUMERIC(12,2) := 0;
  v_shipping NUMERIC(12,2);
  v_discount NUMERIC(12,2) := 0;
  v_coupon TEXT := NULLIF(upper(trim(coalesce(p_coupon, ''))), '');
  v_qty INTEGER;
  v_stock INTEGER;
  v_sold INTEGER;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in before placing an order.';
  END IF;
  IF p_payment_method <> 'cod' THEN
    RAISE EXCEPTION 'Online payments are unavailable until a payment provider is configured.';
  END IF;
  IF p_source NOT IN ('store', 'reel', 'live') THEN
    RAISE EXCEPTION 'Invalid order source.';
  END IF;
  IF p_order_id IS NULL OR p_order_id !~ '^ORD-[A-Za-z0-9-]{8,64}$' THEN
    RAISE EXCEPTION 'Invalid order identifier.';
  END IF;
  IF jsonb_typeof(p_address) IS DISTINCT FROM 'object' OR p_address = '{}'::jsonb THEN
    RAISE EXCEPTION 'A delivery address is required.';
  END IF;
  IF coalesce(trim(p_address->>'name'), '') = ''
    OR coalesce(trim(p_address->>'phone'), '') = ''
    OR coalesce(trim(p_address->>'line'), '') = ''
    OR coalesce(trim(p_address->>'area'), '') = '' THEN
    RAISE EXCEPTION 'The delivery address is incomplete.';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Order items must be an array.';
  END IF;
  IF jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 40 THEN
    RAISE EXCEPTION 'An order must contain between 1 and 40 items.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS entry(value)
    WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
      OR coalesce(entry.value->>'productId', '') = ''
      OR coalesce(entry.value->>'qty', '') !~ '^[1-9][0-9]*$'
      OR length(coalesce(entry.value->>'qty', '')) > 2
      OR (entry.value->>'qty')::INTEGER > 50
  ) THEN
    RAISE EXCEPTION 'Invalid product or quantity in order.';
  END IF;
  IF v_coupon IS NOT NULL AND v_coupon NOT IN ('STREAM10', 'LIVE50') THEN
    RAISE EXCEPTION 'Invalid coupon.';
  END IF;
  IF v_coupon = 'LIVE50' AND p_source <> 'live' THEN
    RAISE EXCEPTION 'This coupon is valid only for live orders.';
  END IF;

  SELECT name INTO v_customer_name
  FROM public.profiles
  WHERE id = v_user_id;

  FOR v_requested IN
    SELECT entry.value->>'productId' AS product_id,
      sum((entry.value->>'qty')::INTEGER)::INTEGER AS qty
    FROM jsonb_array_elements(p_items) AS entry(value)
    GROUP BY entry.value->>'productId'
    ORDER BY entry.value->>'productId'
  LOOP
    SELECT product.* INTO v_product
    FROM public.products AS product
    JOIN public.vendors AS vendor ON vendor.id = product.vendor_id
    WHERE product.id = v_requested.product_id
      AND product.status = 'active'
      AND vendor.status = 'approved'
    FOR UPDATE OF product;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is unavailable.', v_requested.product_id;
    END IF;
    IF v_product.stock < v_requested.qty THEN
      RAISE EXCEPTION 'Insufficient stock for %.', v_product.title;
    END IF;

    v_qty := v_requested.qty;
    v_subtotal := v_subtotal + (v_product.price * v_qty);
    UPDATE public.products
    SET stock = stock - v_qty, sold = sold + v_qty
    WHERE id = v_product.id
    RETURNING stock, sold INTO v_stock, v_sold;

    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'vendorId', v_product.vendor_id,
      'title', v_product.title,
      'thumbnail', v_product.thumbnail,
      'price', v_product.price,
      'qty', v_qty,
      'status', 'pending'
    ));
    v_products := v_products || jsonb_build_array(jsonb_build_object(
      'id', v_product.id, 'stock', v_stock, 'sold', v_sold
    ));
  END LOOP;

  v_shipping := CASE WHEN v_subtotal >= 2000 THEN 0 ELSE 60 END;
  IF v_coupon = 'STREAM10' THEN
    v_discount := least(500, round(v_subtotal * 0.10, 2));
  ELSIF v_coupon = 'LIVE50' THEN
    v_discount := least(50, v_subtotal);
  ELSE
    v_coupon := NULL;
  END IF;

  INSERT INTO public.orders (
    id, customer_id, customer_name, subtotal, shipping, discount, coupon, total,
    status, payment_method, payment_status, source, source_ref_id, address
  ) VALUES (
    p_order_id, v_user_id, coalesce(v_customer_name, 'Customer'), v_subtotal,
    v_shipping, v_discount, v_coupon, v_subtotal + v_shipping - v_discount,
    'pending', 'cod', 'unpaid', p_source, p_source_ref_id, p_address
  ) RETURNING * INTO v_order;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_order_items) AS item(value)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, vendor_id, title, thumbnail, price, qty, status
    ) VALUES (
      v_order.id, v_item->>'productId', v_item->>'vendorId', v_item->>'title',
      v_item->>'thumbnail', (v_item->>'price')::NUMERIC,
      (v_item->>'qty')::INTEGER, 'pending'
    );
    DELETE FROM public.carts
    WHERE user_id = v_user_id AND product_id = v_item->>'productId';
  END LOOP;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_order_items,
    'products', v_products
  );
END;
$$;

ALTER FUNCTION public.place_order_atomic(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.update_vendor_order_status(p_order_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vendor_id TEXT := public.get_my_vendor_id();
  v_allowed TEXT[];
  v_item RECORD;
  v_order public.orders%ROWTYPE;
  v_total INTEGER;
  v_delivered INTEGER;
  v_cancelled INTEGER;
  v_has_shipped BOOLEAN;
  v_has_processing BOOLEAN;
  v_new_status TEXT;
  v_updated INTEGER := 0;
  v_vendor_balance NUMERIC(12,2);
  v_products JSONB := '[]'::jsonb;
  v_stock INTEGER;
  v_sold INTEGER;
BEGIN
  IF auth.uid() IS NULL OR v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor authentication is required.';
  END IF;
  CASE p_status
    WHEN 'processing' THEN v_allowed := ARRAY['pending'];
    WHEN 'shipped' THEN v_allowed := ARRAY['processing'];
    WHEN 'delivered' THEN v_allowed := ARRAY['shipped'];
    WHEN 'cancelled' THEN v_allowed := ARRAY['pending', 'processing'];
    ELSE RAISE EXCEPTION 'Invalid vendor order status.';
  END CASE;

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  FOR v_item IN
    UPDATE public.order_items
    SET status = p_status
    WHERE order_id = p_order_id
      AND vendor_id = v_vendor_id
      AND status = ANY(v_allowed)
    RETURNING product_id, qty, price, vendor_id
  LOOP
    v_updated := v_updated + 1;
    IF p_status = 'cancelled' THEN
      UPDATE public.products
      SET stock = stock + v_item.qty,
          sold = greatest(0, sold - v_item.qty)
      WHERE id = v_item.product_id
      RETURNING stock, sold INTO v_stock, v_sold;
      v_products := v_products || jsonb_build_array(jsonb_build_object(
        'id', v_item.product_id, 'stock', v_stock, 'sold', v_sold
      ));
    ELSIF p_status = 'delivered' THEN
      UPDATE public.vendors
      SET balance = balance + round(v_item.price * v_item.qty * (1 - commission_rate / 100), 2)
      WHERE id = v_item.vendor_id
      RETURNING balance INTO v_vendor_balance;
    END IF;
  END LOOP;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'No eligible order items found for this vendor.';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'delivered'),
    count(*) FILTER (WHERE status = 'cancelled'),
    coalesce(bool_or(status = 'shipped'), FALSE),
    coalesce(bool_or(status = 'processing'), FALSE)
  INTO v_total, v_delivered, v_cancelled, v_has_shipped, v_has_processing
  FROM public.order_items
  WHERE order_id = p_order_id;

  IF v_cancelled = v_total THEN
    v_new_status := 'cancelled';
  ELSIF v_delivered + v_cancelled = v_total AND v_delivered > 0 THEN
    v_new_status := 'delivered';
  ELSIF v_has_shipped THEN
    v_new_status := 'shipped';
  ELSIF v_has_processing THEN
    v_new_status := 'processing';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE public.orders
  SET status = v_new_status,
      payment_status = CASE
        WHEN v_delivered = v_total AND payment_method = 'cod' THEN 'paid'
        ELSE payment_status
      END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((
      SELECT jsonb_agg(to_jsonb(item)) FROM public.order_items AS item
      WHERE item.order_id = p_order_id AND item.vendor_id = v_vendor_id
    ), '[]'::jsonb),
    'products', v_products,
    'vendor_balance', v_vendor_balance
  );
END;
$$;

ALTER FUNCTION public.update_vendor_order_status(TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_updated INTEGER := 0;
  v_expected TEXT;
  v_new_status TEXT;
  v_total INTEGER;
  v_delivered INTEGER;
  v_products JSONB := '[]'::jsonb;
  v_vendor_balances JSONB := '[]'::jsonb;
  v_stock INTEGER;
  v_sold INTEGER;
  v_balance NUMERIC(12,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access is required.';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF p_status = 'cancelled' THEN
    IF v_order.status NOT IN ('pending', 'processing') THEN
      RAISE EXCEPTION 'Only pending or processing orders can be cancelled.';
    END IF;
    FOR v_item IN
      SELECT product_id, qty FROM public.order_items
      WHERE order_id = p_order_id AND status <> 'cancelled'
    LOOP
      UPDATE public.products
      SET stock = stock + v_item.qty,
          sold = greatest(0, sold - v_item.qty)
      WHERE id = v_item.product_id
      RETURNING stock, sold INTO v_stock, v_sold;
      v_products := v_products || jsonb_build_array(jsonb_build_object(
        'id', v_item.product_id, 'stock', v_stock, 'sold', v_sold
      ));
    END LOOP;
    UPDATE public.order_items SET status = 'cancelled' WHERE order_id = p_order_id;
  ELSE
    v_expected := CASE p_status
      WHEN 'processing' THEN 'pending'
      WHEN 'shipped' THEN 'processing'
      WHEN 'delivered' THEN 'shipped'
      ELSE NULL
    END;
    IF v_expected IS NULL OR v_order.status <> v_expected THEN
      RAISE EXCEPTION 'Invalid admin order status transition.';
    END IF;

    IF p_status = 'delivered' THEN
      FOR v_item IN
        UPDATE public.order_items SET status = 'delivered'
        WHERE order_id = p_order_id AND status = 'shipped'
        RETURNING vendor_id, price, qty
      LOOP
        v_updated := v_updated + 1;
        UPDATE public.vendors
        SET balance = balance + round(v_item.price * v_item.qty * (1 - commission_rate / 100), 2)
        WHERE id = v_item.vendor_id
        RETURNING balance INTO v_balance;
        v_vendor_balances := v_vendor_balances || jsonb_build_array(jsonb_build_object(
          'id', v_item.vendor_id, 'balance', v_balance
        ));
      END LOOP;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'No shipped order items found.';
      END IF;
    ELSE
      UPDATE public.order_items SET status = p_status
      WHERE order_id = p_order_id AND status = v_expected;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'No eligible order items found.';
      END IF;
    END IF;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'delivered')
  INTO v_total, v_delivered
  FROM public.order_items WHERE order_id = p_order_id;
  v_new_status := p_status;
  UPDATE public.orders
  SET status = v_new_status,
      payment_status = CASE
        WHEN p_status = 'delivered' AND payment_method = 'cod' AND v_delivered = v_total THEN 'paid'
        ELSE payment_status
      END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((SELECT jsonb_agg(to_jsonb(item)) FROM public.order_items AS item WHERE item.order_id = p_order_id), '[]'::jsonb),
    'products', v_products,
    'vendor_balances', v_vendor_balances
  );
END;
$$;

ALTER FUNCTION public.admin_update_order_status(TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.cancel_my_order(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_products JSONB := '[]'::jsonb;
  v_stock INTEGER;
  v_sold INTEGER;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in before cancelling an order.';
  END IF;
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND customer_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Only your pending orders can be cancelled.';
  END IF;

  FOR v_item IN
    SELECT product_id, qty FROM public.order_items
    WHERE order_id = p_order_id AND status <> 'cancelled'
  LOOP
    UPDATE public.products
    SET stock = stock + v_item.qty,
        sold = greatest(0, sold - v_item.qty)
    WHERE id = v_item.product_id
    RETURNING stock, sold INTO v_stock, v_sold;
    v_products := v_products || jsonb_build_array(jsonb_build_object(
      'id', v_item.product_id, 'stock', v_stock, 'sold', v_sold
    ));
  END LOOP;

  UPDATE public.order_items SET status = 'cancelled' WHERE order_id = p_order_id;
  UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('order', to_jsonb(v_order), 'products', v_products);
END;
$$;

ALTER FUNCTION public.cancel_my_order(TEXT) OWNER TO postgres;

-- Payout rows are read-only to vendors; all balance changes happen transactionally.
DROP POLICY IF EXISTS "Vendors can view and request own payouts" ON public.payouts;
CREATE POLICY "Vendors can view own payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING (vendor_id = public.get_my_vendor_id());

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
  IF auth.uid() IS NULL OR v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor authentication is required.';
  END IF;
  IF p_amount IS NULL OR p_amount < 1000
    OR p_method IS NULL OR p_method NOT IN ('bank', 'bkash')
    OR jsonb_typeof(p_account_info) IS DISTINCT FROM 'object'
    OR coalesce(trim(p_account_info->>'account'), '') = ''
    OR length(p_account_info->>'account') > 200
    OR length(coalesce(p_note, '')) > 500 THEN
    RAISE EXCEPTION 'A valid payout amount, method, and account are required.';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors
  WHERE id = v_vendor_id AND status = 'approved'
  FOR UPDATE;
  IF NOT FOUND OR v_vendor.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient available vendor balance.';
  END IF;

  UPDATE public.vendors SET balance = balance - p_amount WHERE id = v_vendor_id;
  INSERT INTO public.payouts (vendor_id, amount, method, account_info, status, note)
  VALUES (v_vendor_id, p_amount, p_method, p_account_info, 'pending', p_note)
  RETURNING * INTO v_payout;
  RETURN jsonb_build_object('payout', to_jsonb(v_payout), 'vendor_balance', v_vendor.balance - p_amount);
END;
$$;

ALTER FUNCTION public.request_vendor_payout(NUMERIC, TEXT, JSONB, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.admin_update_payout_status(p_payout_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
  v_balance NUMERIC(12,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access is required.';
  END IF;
  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found.';
  END IF;
  IF (p_status = 'processing' AND v_payout.status <> 'pending')
    OR (p_status = 'paid' AND v_payout.status <> 'processing')
    OR (p_status = 'rejected' AND v_payout.status NOT IN ('pending', 'processing')) THEN
    RAISE EXCEPTION 'Invalid payout status transition.';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('processing', 'paid', 'rejected') THEN
    RAISE EXCEPTION 'Invalid payout status.';
  END IF;

  IF p_status = 'rejected' THEN
    UPDATE public.vendors SET balance = balance + v_payout.amount
    WHERE id = v_payout.vendor_id RETURNING balance INTO v_balance;
  ELSE
    SELECT balance INTO v_balance FROM public.vendors WHERE id = v_payout.vendor_id;
  END IF;
  UPDATE public.payouts
  SET status = p_status,
      processed_at = CASE WHEN p_status IN ('paid', 'rejected') THEN now() ELSE processed_at END
  WHERE id = p_payout_id
  RETURNING * INTO v_payout;
  RETURN jsonb_build_object('payout', to_jsonb(v_payout), 'vendor_balance', v_balance);
END;
$$;

ALTER FUNCTION public.admin_update_payout_status(TEXT, TEXT) OWNER TO postgres;

-- Follow state and counters are maintained from the protected join table.
CREATE OR REPLACE FUNCTION public.update_vendor_followers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.vendors SET followers = followers + 1 WHERE id = NEW.vendor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.vendors SET followers = greatest(0, followers - 1) WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION public.update_vendor_followers_count() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.toggle_vendor_follow(p_vendor_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_following BOOLEAN;
  v_followers INTEGER;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in before following a store.';
  END IF;
  PERFORM 1 FROM public.vendors WHERE id = p_vendor_id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store is not available to follow.';
  END IF;

  DELETE FROM public.follows WHERE user_id = v_user_id AND vendor_id = p_vendor_id;
  IF FOUND THEN
    v_following := FALSE;
  ELSE
    INSERT INTO public.follows(user_id, vendor_id) VALUES(v_user_id, p_vendor_id);
    v_following := TRUE;
  END IF;

  SELECT followers INTO v_followers FROM public.vendors WHERE id = p_vendor_id;
  RETURN jsonb_build_object('following', v_following, 'followers', v_followers);
END;
$$;

ALTER FUNCTION public.toggle_vendor_follow(TEXT) OWNER TO postgres;

-- Match dispute fields/statuses used by the customer and admin screens.
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.disputes
SET status = CASE status
  WHEN 'under_review' THEN 'in_review'
  WHEN 'resolved' THEN 'resolved_rejected'
  WHEN 'rejected' THEN 'resolved_rejected'
  ELSE status
END;

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_status_check
  CHECK (status IN ('open', 'in_review', 'resolved_rejected', 'resolved_refund'));

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id TEXT,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dispute public.disputes%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access is required.';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('in_review', 'resolved_rejected', 'resolved_refund')
    OR length(coalesce(p_note, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid dispute resolution.';
  END IF;

  SELECT * INTO v_dispute FROM public.disputes
  WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND OR v_dispute.status NOT IN ('open', 'in_review') THEN
    RAISE EXCEPTION 'Dispute is not open for resolution.';
  END IF;

  UPDATE public.disputes
  SET status = p_status,
      resolution = CASE
        WHEN p_status = 'resolved_refund' THEN 'Refund approved; process the payment separately.'
        WHEN p_status = 'resolved_rejected' THEN 'Claim rejected.'
        ELSE NULL
      END,
      notes = CASE WHEN coalesce(trim(p_note), '') = '' THEN notes
        ELSE notes || jsonb_build_array(jsonb_build_object('text', p_note, 'at', now())) END,
      updated_at = now()
  WHERE id = p_dispute_id
  RETURNING * INTO v_dispute;
  RETURN to_jsonb(v_dispute);
END;
$$;

ALTER FUNCTION public.admin_resolve_dispute(TEXT, TEXT, TEXT) OWNER TO postgres;

-- Scope uploaded product/reel objects to the authenticated vendor's folder.
DROP POLICY IF EXISTS "Vendor Upload: product-images" ON storage.objects;
CREATE POLICY "Vendor Upload: product-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.get_my_vendor_id()
  );

DROP POLICY IF EXISTS "Vendor Upload: reels" ON storage.objects;
CREATE POLICY "Vendor Upload: reels"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reels'
    AND (storage.foldername(name))[1] = public.get_my_vendor_id()
  );

DROP POLICY IF EXISTS "User Upload: avatars" ON storage.objects;
CREATE POLICY "User Upload: avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

REVOKE ALL ON FUNCTION public.place_order_atomic(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_vendor_order_status(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_order_status(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_my_order(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_vendor_payout(NUMERIC, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_payout_status(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_vendor_follow(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_resolve_dispute(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.place_order_atomic(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vendor_order_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_vendor_payout(NUMERIC, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payout_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_vendor_follow(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(TEXT, TEXT, TEXT) TO authenticated;