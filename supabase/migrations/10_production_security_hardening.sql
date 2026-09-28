-- StreamCart production security hardening.
-- Apply after migrations 01 through 09.

BEGIN;

-- Defense in depth: only the intended roles may invoke commerce/social RPCs.
REVOKE EXECUTE ON FUNCTION public.place_order_atomic(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_vendor_order_status(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_my_order(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_vendor_payout(NUMERIC, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_payout_status(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_vendor_follow(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_user_cart(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_user_wishlist(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_reel_with_products(JSONB, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_reel_engagement(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_reel_comment(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_reel_event(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_stream_message(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_stream_like(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_conversation_message(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_verified_review(TEXT, NUMERIC, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_reel_event(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order_atomic(TEXT, JSONB, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vendor_order_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_vendor_payout(NUMERIC, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payout_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_vendor_follow(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_cart(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_wishlist(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reel_with_products(JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_reel_engagement(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_reel_comment(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_stream_message(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_stream_like(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_verified_review(TEXT, NUMERIC, TEXT) TO authenticated;

-- Direct message inserts are constrained even if a client bypasses the RPC.
DROP POLICY IF EXISTS "Authenticated users can post stream messages" ON public.stream_messages;
CREATE POLICY "Authenticated users can post live stream messages"
  ON public.stream_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(trim(message)) BETWEEN 1 AND 500
    AND EXISTS (
      SELECT 1 FROM public.live_streams
      WHERE id = stream_messages.stream_id AND status = 'live'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stream_messages_message_length_check'
      AND conrelid = 'public.stream_messages'::regclass
  ) THEN
    ALTER TABLE public.stream_messages
      ADD CONSTRAINT stream_messages_message_length_check CHECK (length(trim(message)) BETWEEN 1 AND 500);
  END IF;
END;
$$;

-- Keep the high-volume ownership and event lookups indexed.
CREATE INDEX IF NOT EXISTS idx_user_events_user_created_at ON public.user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor_customer ON public.conversations(vendor_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages(conversation_id, created_at DESC);

COMMIT;
