/*
  # Add RLS policies for airbnb-images storage bucket

  1. Changes
    - Ensure bucket is marked as public (for displaying images on website)
    - Public SELECT policy (anyone can view images)
    - Admin INSERT policy (only admins can upload images)
    - Admin UPDATE policy (only admins can update images)
    - Admin DELETE policy (only admins can delete images)

  2. Notes
    - Bucket must be created in Supabase Dashboard first if it doesn't exist
    - All policies check for admin status via profiles.isAdmin or profiles.is_admin
    - Bucket is public to allow displaying images on the website
*/

-- Ensure the bucket is marked as public (if it exists)
DO $$
BEGIN
  UPDATE storage.buckets 
  SET public = true 
  WHERE id = 'airbnb-images';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Bucket "airbnb-images" not found. Please create it in Supabase Dashboard and mark it as public.';
  END IF;
END $$;

-- Allow public to view airbnb images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view airbnb images'
  ) THEN
    CREATE POLICY "Public can view airbnb images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'airbnb-images');
  ELSE
    DROP POLICY IF EXISTS "Public can view airbnb images" ON storage.objects;
    CREATE POLICY "Public can view airbnb images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'airbnb-images');
  END IF;
END $$;

-- Allow admins to upload airbnb images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can upload airbnb images'
  ) THEN
    CREATE POLICY "Admins can upload airbnb images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    DROP POLICY IF EXISTS "Admins can upload airbnb images" ON storage.objects;
    CREATE POLICY "Admins can upload airbnb images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Allow admins to update airbnb images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can update airbnb images'
  ) THEN
    CREATE POLICY "Admins can update airbnb images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    DROP POLICY IF EXISTS "Admins can update airbnb images" ON storage.objects;
    CREATE POLICY "Admins can update airbnb images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Allow admins to delete airbnb images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can delete airbnb images'
  ) THEN
    CREATE POLICY "Admins can delete airbnb images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    DROP POLICY IF EXISTS "Admins can delete airbnb images" ON storage.objects;
    CREATE POLICY "Admins can delete airbnb images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'airbnb-images'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

