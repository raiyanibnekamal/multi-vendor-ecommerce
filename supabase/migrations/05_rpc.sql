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
