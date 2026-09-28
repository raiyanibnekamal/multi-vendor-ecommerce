-- StreamCart order payment metadata and persisted order notifications.
-- Apply after migrations 01 through 10.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_provider_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_provider_check
  CHECK (payment_provider IN ('cod', 'mock', 'bkash', 'nagad', 'card'));

-- Secure demo-payment wrapper. It never contacts a bank or wallet and is intended
-- for staging/demo traffic until a signed provider webhook replaces it.
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

ALTER FUNCTION public.place_order_mock_payment(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.place_order_mock_payment(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order_mock_payment(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

COMMIT;
