/*
  # Add RLS policies for Tour Photos storage bucket

  1. Changes
    - Ensure bucket is marked as public
    - Public read access for all tour photos
    - Admin INSERT policy (with folder creation support)
    - Admin UPDATE policy
    - Admin DELETE policy

  2. Notes
    - All policies check for admin status via profiles.isAdmin or profiles.is_admin
    - Folder creation is handled automatically by the INSERT policy
    - When uploading to a new path (e.g., "Tour Photos/TourName/filename.jpg"), 
      Supabase Storage automatically creates the folder structure
    - Bucket must be created in Supabase Dashboard first if it doesn't exist
*/

-- Ensure the bucket is marked as public (if it exists)
-- Try both possible bucket names: 'Tour Photos' and 'Tour Photo's'
DO $$
BEGIN
  -- Try 'Tour Photos' first (current standard)
  UPDATE storage.buckets 
  SET public = true 
  WHERE id = 'Tour Photos';
  
  -- If not found, try 'Tour Photo's' (legacy name)
  IF NOT FOUND THEN
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'Tour Photo''s';
    
    IF NOT FOUND THEN
      RAISE NOTICE 'Bucket "Tour Photos" or "Tour Photo''s" not found. Please create it in Supabase Dashboard and mark it as public.';
    END IF;
  END IF;
END $$;

-- Enable public read access for the Tour Photos bucket
-- Handle both 'Tour Photos' and legacy 'Tour Photo's' bucket names
DO $$
BEGIN
  -- Drop old conflicting policy if it exists
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view tour photos'
  ) THEN
    CREATE POLICY "Public can view tour photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s');
  ELSE
    -- Update existing policy to handle both bucket names
    DROP POLICY IF EXISTS "Public can view tour photos" ON storage.objects;
    CREATE POLICY "Public can view tour photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s');
  END IF;
END $$;

-- Allow admins to upload tour photos (including to new folders)
-- Handle both 'Tour Photos' and legacy 'Tour Photo's' bucket names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can upload tour photos'
  ) THEN
    CREATE POLICY "Admins can upload tour photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    -- Update existing policy to handle both bucket names
    DROP POLICY IF EXISTS "Admins can upload tour photos" ON storage.objects;
    CREATE POLICY "Admins can upload tour photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Note: Folder creation is handled by the INSERT policy above
-- When uploading to a new path (e.g., "Tour Photos/TourName/filename.jpg"), 
-- Supabase Storage automatically creates the folder structure

-- Allow admins to update tour photos
-- Handle both 'Tour Photos' and legacy 'Tour Photo's' bucket names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can update tour photos'
  ) THEN
    CREATE POLICY "Admins can update tour photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    -- Update existing policy to handle both bucket names
    DROP POLICY IF EXISTS "Admins can update tour photos" ON storage.objects;
    CREATE POLICY "Admins can update tour photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Allow admins to delete tour photos
-- Handle both 'Tour Photos' and legacy 'Tour Photo's' bucket names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can delete tour photos'
  ) THEN
    CREATE POLICY "Admins can delete tour photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    -- Update existing policy to handle both bucket names
    DROP POLICY IF EXISTS "Admins can delete tour photos" ON storage.objects;
    CREATE POLICY "Admins can delete tour photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      (bucket_id = 'Tour Photos' OR bucket_id = 'Tour Photo''s')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;


