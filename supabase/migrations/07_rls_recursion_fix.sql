-- Break recursive RLS helper lookups and replace any overlapping order policies.

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

DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('orders', 'order_items')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END;
$$;

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR public.order_has_vendor_item(orders.id, public.get_my_vendor_id())
    OR public.is_admin()
  );

CREATE POLICY "Authenticated customers can create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins have full access to orders and items"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Order items viewable by customer, vendor or admin"
  ON public.order_items FOR SELECT
  USING (
    vendor_id = public.get_my_vendor_id()
    OR public.is_order_customer(order_items.order_id, auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Authenticated customers can create own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.is_order_customer(order_items.order_id, auth.uid()));

CREATE POLICY "Vendors can update status of own order items"
  ON public.order_items FOR UPDATE
  USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

CREATE POLICY "Admins have full access to order_items"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
