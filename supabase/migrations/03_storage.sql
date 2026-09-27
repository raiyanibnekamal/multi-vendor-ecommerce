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
