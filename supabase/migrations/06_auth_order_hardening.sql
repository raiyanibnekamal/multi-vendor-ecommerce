-- Apply auth-role and order-write hardening to databases that already ran 01-05.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'vendor' THEN 'vendor' ELSE 'customer' END,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP POLICY IF EXISTS "Customers or guests can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Customers or guests can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated customers can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated customers can create own order items" ON public.order_items;

CREATE POLICY "Authenticated customers can create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Authenticated customers can create own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.is_order_customer(order_items.order_id, auth.uid()));

UPDATE public.vendors AS vendor
SET owner_id = profile.id
FROM public.profiles AS profile
WHERE vendor.owner_id IS NULL
  AND profile.role = 'vendor'
  AND lower(profile.email) = lower(vendor.email);