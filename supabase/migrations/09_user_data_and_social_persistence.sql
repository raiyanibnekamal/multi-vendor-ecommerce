-- Persist signed-in shopper, reel, stream, messaging, and review activity.

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

ALTER FUNCTION public.is_active_user() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.get_my_vendor_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT vendor.id
  FROM public.vendors AS vendor
  JOIN public.profiles AS profile ON profile.id = vendor.owner_id
  WHERE vendor.owner_id = auth.uid()
    AND profile.role = 'vendor'
    AND profile.status = 'active'
  LIMIT 1;
$$;

ALTER FUNCTION public.get_my_vendor_id() OWNER TO postgres;

DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
CREATE POLICY "Active users can manage own cart"
  ON public.carts FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlists;
CREATE POLICY "Active users can manage own wishlist"
  ON public.wishlists FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Users can like/unlike reels" ON public.reel_likes;
CREATE POLICY "Active users can like/unlike reels"
  ON public.reel_likes FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Users can save/unsave reels" ON public.reel_saves;
CREATE POLICY "Active users can save/unsave reels"
  ON public.reel_saves FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Users can add comments" ON public.reel_comments;
CREATE POLICY "Active users can add comments"
  ON public.reel_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Users can manage own follows" ON public.follows;
CREATE POLICY "Active users can manage own follows"
  ON public.follows FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Authenticated users can post stream messages" ON public.stream_messages;

DROP POLICY IF EXISTS "Participants can view and send messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    public.is_active_user() AND EXISTS (
      SELECT 1 FROM public.conversations AS conversation
      WHERE conversation.id = messages.conversation_id
        AND (conversation.customer_id = auth.uid() OR conversation.vendor_id = public.get_my_vendor_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Active users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.is_active_user())
  WITH CHECK (id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Vendor Upload: product-images" ON storage.objects;
CREATE POLICY "Vendor Upload: product-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_active_user()
    AND (storage.foldername(name))[1] = public.get_my_vendor_id()
  );

DROP POLICY IF EXISTS "Vendor Upload: reels" ON storage.objects;
CREATE POLICY "Vendor Upload: reels"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reels'
    AND public.is_active_user()
    AND (storage.foldername(name))[1] = public.get_my_vendor_id()
  );

DROP POLICY IF EXISTS "User Upload: avatars" ON storage.objects;
CREATE POLICY "User Upload: avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.is_active_user()
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE OR REPLACE FUNCTION public.sync_user_cart(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_product_ids TEXT[];
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to sync your cart.';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Cart must contain no more than 50 items.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS entry(value)
    WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
      OR coalesce(entry.value->>'productId', '') = ''
      OR coalesce(entry.value->>'qty', '') !~ '^[1-9][0-9]?$'
      OR (entry.value->>'qty')::INTEGER > 50
  ) THEN
    RAISE EXCEPTION 'Invalid cart item or quantity.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS entry(value)
    GROUP BY entry.value->>'productId' HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cart contains duplicate products.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS entry(value)
    LEFT JOIN public.products AS product ON product.id = entry.value->>'productId'
    LEFT JOIN public.vendors AS vendor ON vendor.id = product.vendor_id
    WHERE product.id IS NULL OR product.status <> 'active'
      OR vendor.status <> 'approved'
      OR product.stock < (entry.value->>'qty')::INTEGER
  ) THEN
    RAISE EXCEPTION 'A cart product is unavailable or has insufficient stock.';
  END IF;

  SELECT coalesce(array_agg(entry.value->>'productId'), ARRAY[]::TEXT[])
  INTO v_product_ids
  FROM jsonb_array_elements(p_items) AS entry(value);

  INSERT INTO public.carts(user_id, product_id, qty)
  SELECT v_user_id, entry.value->>'productId', (entry.value->>'qty')::INTEGER
  FROM jsonb_array_elements(p_items) AS entry(value)
  ON CONFLICT (user_id, product_id) DO UPDATE
  SET qty = EXCLUDED.qty, updated_at = now();

  DELETE FROM public.carts
  WHERE user_id = v_user_id AND NOT (product_id = ANY(v_product_ids));

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('productId', product_id, 'qty', qty))
    FROM public.carts WHERE user_id = v_user_id
  ), '[]'::jsonb);
END;
$$;

ALTER FUNCTION public.sync_user_cart(JSONB) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.sync_user_wishlist(p_product_ids JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_product_ids TEXT[];
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to sync your wishlist.';
  END IF;
  IF jsonb_typeof(p_product_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_product_ids) > 200 THEN
    RAISE EXCEPTION 'Wishlist must contain no more than 200 products.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_product_ids) AS entry(value)
    WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'string'
      OR length(entry.value #>> '{}') > 160
  ) THEN
    RAISE EXCEPTION 'Invalid wishlist product identifier.';
  END IF;

  SELECT coalesce(array_agg(value #>> '{}'), ARRAY[]::TEXT[])
  INTO v_product_ids
  FROM jsonb_array_elements(p_product_ids);
  IF EXISTS (
    SELECT 1 FROM unnest(v_product_ids) AS entry(product_id)
    LEFT JOIN public.products AS product ON product.id = entry.product_id
    LEFT JOIN public.vendors AS vendor ON vendor.id = product.vendor_id
    WHERE product.id IS NULL OR product.status <> 'active' OR vendor.status <> 'approved'
  ) THEN
    RAISE EXCEPTION 'A wishlist product is unavailable.';
  END IF;

  INSERT INTO public.wishlists(user_id, product_id)
  SELECT v_user_id, entry.product_id FROM unnest(v_product_ids) AS entry(product_id)
  ON CONFLICT (user_id, product_id) DO NOTHING;
  DELETE FROM public.wishlists
  WHERE user_id = v_user_id AND NOT (product_id = ANY(v_product_ids));

  RETURN to_jsonb(v_product_ids);
END;
$$;

ALTER FUNCTION public.sync_user_wishlist(JSONB) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.create_reel_with_products(p_reel JSONB, p_product_ids TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vendor_id TEXT := public.get_my_vendor_id();
  v_reel_id TEXT := p_reel->>'id';
  v_reel public.reels%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() OR v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor authentication is required.';
  END IF;
  IF jsonb_typeof(p_reel) IS DISTINCT FROM 'object'
    OR coalesce(trim(p_reel->>'caption'), '') = ''
    OR length(p_reel->>'caption') > 220
    OR coalesce(p_reel->>'videoUrl', '') = ''
    OR coalesce(cardinality(p_product_ids), 0) < 1 OR cardinality(p_product_ids) > 5 THEN
    RAISE EXCEPTION 'Invalid reel details or tagged products.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_product_ids) AS entry(product_id)
    LEFT JOIN public.products AS product ON product.id = entry.product_id
    WHERE product.id IS NULL OR product.vendor_id <> v_vendor_id
  ) THEN
    RAISE EXCEPTION 'A reel can only tag products from your store.';
  END IF;

  INSERT INTO public.reels(id, vendor_id, video_url, poster_url, caption, status)
  VALUES (v_reel_id, v_vendor_id, p_reel->>'videoUrl', p_reel->>'poster', p_reel->>'caption', 'pending')
  RETURNING * INTO v_reel;

  INSERT INTO public.reel_products(reel_id, product_id)
  SELECT v_reel.id, entry.product_id FROM unnest(p_product_ids) AS entry(product_id);

  RETURN jsonb_build_object(
    'reel', to_jsonb(v_reel),
    'productIds', to_jsonb(p_product_ids)
  );
END;
$$;

ALTER FUNCTION public.create_reel_with_products(JSONB, TEXT[]) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.toggle_reel_engagement(p_reel_id TEXT, p_kind TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_active BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to interact with reels.';
  END IF;
  IF p_kind NOT IN ('like', 'save') THEN
    RAISE EXCEPTION 'Invalid reel interaction.';
  END IF;
  PERFORM 1 FROM public.reels WHERE id = p_reel_id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reel is unavailable.';
  END IF;

  IF p_kind = 'like' THEN
    DELETE FROM public.reel_likes WHERE user_id = v_user_id AND reel_id = p_reel_id;
    IF FOUND THEN
      v_active := FALSE;
    ELSE
      INSERT INTO public.reel_likes(user_id, reel_id) VALUES(v_user_id, p_reel_id);
      v_active := TRUE;
    END IF;
    SELECT likes INTO v_count FROM public.reels WHERE id = p_reel_id;
  ELSE
    DELETE FROM public.reel_saves WHERE user_id = v_user_id AND reel_id = p_reel_id;
    IF FOUND THEN
      v_active := FALSE;
    ELSE
      INSERT INTO public.reel_saves(user_id, reel_id) VALUES(v_user_id, p_reel_id);
      v_active := TRUE;
    END IF;
    SELECT saves INTO v_count FROM public.reels WHERE id = p_reel_id;
  END IF;
  RETURN jsonb_build_object('active', v_active, 'count', v_count);
END;
$$;

ALTER FUNCTION public.toggle_reel_engagement(TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.add_reel_comment(p_reel_id TEXT, p_comment TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT;
  v_comment public.reel_comments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to comment on reels.';
  END IF;
  IF coalesce(trim(p_comment), '') = '' OR length(p_comment) > 1000 THEN
    RAISE EXCEPTION 'Comment must contain between 1 and 1000 characters.';
  END IF;
  SELECT name INTO v_name FROM public.profiles WHERE id = v_user_id;
  INSERT INTO public.reel_comments(reel_id, user_id, user_name, comment)
  SELECT p_reel_id, v_user_id, coalesce(v_name, 'Customer'), trim(p_comment)
  WHERE EXISTS (SELECT 1 FROM public.reels WHERE id = p_reel_id AND status = 'approved')
  RETURNING * INTO v_comment;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reel is unavailable.';
  END IF;
  RETURN to_jsonb(v_comment);
END;
$$;

ALTER FUNCTION public.add_reel_comment(TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.record_reel_event(p_reel_id TEXT, p_event TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_event NOT IN ('view', 'share') THEN
    RAISE EXCEPTION 'Invalid reel event.';
  END IF;
  UPDATE public.reels
  SET views = CASE WHEN p_event = 'view' THEN views + 1 ELSE views END,
      shares = CASE WHEN p_event = 'share' THEN shares + 1 ELSE shares END
  WHERE id = p_reel_id AND status = 'approved'
  RETURNING CASE WHEN p_event = 'view' THEN views ELSE shares END INTO v_count;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reel is unavailable.';
  END IF;
  RETURN v_count;
END;
$$;

ALTER FUNCTION public.record_reel_event(TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.send_stream_message(p_stream_id TEXT, p_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_name TEXT;
  v_vendor_id TEXT := public.get_my_vendor_id();
  v_stream_vendor_id TEXT;
  v_message public.stream_messages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to chat in live streams.';
  END IF;
  IF coalesce(trim(p_text), '') = '' OR length(p_text) > 500 THEN
    RAISE EXCEPTION 'Message must contain between 1 and 500 characters.';
  END IF;
  SELECT vendor_id INTO v_stream_vendor_id FROM public.live_streams
  WHERE id = p_stream_id AND status = 'live';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stream is not live.';
  END IF;
  SELECT name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  INSERT INTO public.stream_messages(stream_id, user_id, user_name, message, is_vendor)
  VALUES(p_stream_id, v_user_id, coalesce(v_user_name, 'Viewer'), trim(p_text), v_vendor_id = v_stream_vendor_id)
  RETURNING * INTO v_message;
  RETURN to_jsonb(v_message);
END;
$$;

ALTER FUNCTION public.send_stream_message(TEXT, TEXT) OWNER TO postgres;

CREATE TABLE IF NOT EXISTS public.stream_likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_id TEXT NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stream_id)
);

ALTER TABLE public.stream_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stream likes viewable by everyone"
  ON public.stream_likes FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.update_stream_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams SET likes = likes + 1 WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.live_streams SET likes = greatest(0, likes - 1) WHERE id = OLD.stream_id;
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION public.update_stream_likes_count() OWNER TO postgres;
DROP TRIGGER IF EXISTS tr_stream_likes_count ON public.stream_likes;
CREATE TRIGGER tr_stream_likes_count
  AFTER INSERT OR DELETE ON public.stream_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_stream_likes_count();

CREATE OR REPLACE FUNCTION public.toggle_stream_like(p_stream_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_active BOOLEAN;
  v_likes INTEGER;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to like a live stream.';
  END IF;
  PERFORM 1 FROM public.live_streams WHERE id = p_stream_id AND status = 'live' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stream is not live.';
  END IF;
  DELETE FROM public.stream_likes WHERE user_id = v_user_id AND stream_id = p_stream_id;
  IF FOUND THEN
    v_active := FALSE;
  ELSE
    INSERT INTO public.stream_likes(user_id, stream_id) VALUES(v_user_id, p_stream_id);
    v_active := TRUE;
  END IF;
  SELECT likes INTO v_likes FROM public.live_streams WHERE id = p_stream_id;
  RETURN jsonb_build_object('active', v_active, 'likes', v_likes);
END;
$$;

ALTER FUNCTION public.toggle_stream_like(TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.send_conversation_message(
  p_vendor_id TEXT,
  p_text TEXT,
  p_conversation_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vendor_owner UUID := public.get_my_vendor_id() IS NOT NULL;
  v_my_vendor_id TEXT := public.get_my_vendor_id();
  v_customer_id UUID;
  v_conversation_id TEXT;
  v_message public.messages%ROWTYPE;
  v_from_role TEXT;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to send a message.';
  END IF;
  IF coalesce(trim(p_text), '') = '' OR length(p_text) > 2000 THEN
    RAISE EXCEPTION 'Message must contain between 1 and 2000 characters.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = p_vendor_id AND status <> 'rejected') THEN
    RAISE EXCEPTION 'Store is unavailable.';
  END IF;

  IF v_vendor_owner THEN
    IF v_my_vendor_id <> p_vendor_id THEN
      RAISE EXCEPTION 'You can only reply for your own store.';
    END IF;
    SELECT customer_id INTO v_customer_id FROM public.conversations
    WHERE vendor_id = p_vendor_id AND id = p_conversation_id;
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'Conversation is unavailable.';
    END IF;
    v_conversation_id := p_conversation_id;
    v_from_role := 'vendor';
  ELSE
    v_customer_id := v_user_id;
    v_from_role := 'customer';
  END IF;

  INSERT INTO public.conversations(vendor_id, customer_id)
  VALUES(p_vendor_id, v_customer_id)
  ON CONFLICT (vendor_id, customer_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.messages(conversation_id, from_role, sender_id, text)
  VALUES(v_conversation_id, v_from_role, v_user_id, trim(p_text))
  RETURNING * INTO v_message;
  RETURN jsonb_build_object('conversation_id', v_conversation_id, 'message', to_jsonb(v_message));
END;
$$;

ALTER FUNCTION public.send_conversation_message(TEXT, TEXT, TEXT) OWNER TO postgres;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE OR REPLACE FUNCTION public.create_verified_review(p_product_id TEXT, p_rating NUMERIC, p_comment TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT;
  v_review public.reviews%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Sign in to review a product.';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR p_rating * 2 <> trunc(p_rating * 2)
    OR length(coalesce(p_comment, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid review rating or comment.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items AS item
    JOIN public.orders AS customer_order ON customer_order.id = item.order_id
    WHERE item.product_id = p_product_id AND item.status = 'delivered'
      AND customer_order.customer_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'A delivered purchase is required before reviewing this product.';
  END IF;
  SELECT name INTO v_name FROM public.profiles WHERE id = v_user_id;
  INSERT INTO public.reviews(product_id, user_id, user_name, rating, comment, verified_purchase)
  VALUES(p_product_id, v_user_id, coalesce(v_name, 'Customer'), p_rating, nullif(trim(p_comment), ''), TRUE)
  RETURNING * INTO v_review;
  UPDATE public.products AS product
  SET rating = summary.average_rating, reviews_count = summary.review_count
  FROM (
    SELECT round(avg(rating), 2) AS average_rating, count(*)::INTEGER AS review_count
    FROM public.reviews WHERE product_id = p_product_id
  ) AS summary
  WHERE product.id = p_product_id;
  RETURN to_jsonb(v_review);
END;
$$;

ALTER FUNCTION public.create_verified_review(TEXT, NUMERIC, TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.sync_user_cart(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_wishlist(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_reel_with_products(JSONB, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_reel_engagement(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_reel_comment(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_reel_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_stream_message(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_stream_like(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_conversation_message(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_verified_review(TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_user_cart(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_wishlist(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reel_with_products(JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_reel_engagement(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_reel_comment(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_reel_event(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_stream_message(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_stream_like(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_verified_review(TEXT, NUMERIC, TEXT) TO authenticated;