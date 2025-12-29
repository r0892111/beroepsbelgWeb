/*
  # Add RLS policies for job-applications storage bucket

  1. Changes
    - Ensure bucket is marked as private (sensitive documents)
    - Admin SELECT policy (view/download files)
    - Anyone can INSERT (for job applicants)
    - Admin UPDATE policy
    - Admin DELETE policy

  2. Notes
    - Bucket must be created in Supabase Dashboard first if it doesn't exist
    - All policies check for admin status via profiles.isAdmin or profiles.is_admin
    - Bucket is private to protect sensitive applicant data
    - Job applicants (anon/authenticated) can upload but cannot view/download
*/

-- Ensure the bucket is marked as private (if it exists)
DO $$
BEGIN
  UPDATE storage.buckets 
  SET public = false 
  WHERE id = 'job-applications';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Bucket "job-applications" not found. Please create it in Supabase Dashboard and mark it as private.';
  END IF;
END $$;

-- Allow admins to view/download job application files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can view job application files'
  ) THEN
    CREATE POLICY "Admins can view job application files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    DROP POLICY IF EXISTS "Admins can view job application files" ON storage.objects;
    CREATE POLICY "Admins can view job application files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Allow anyone (anon and authenticated) to upload job application files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can upload job application files'
  ) THEN
    CREATE POLICY "Anyone can upload job application files"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'job-applications');
  ELSE
    DROP POLICY IF EXISTS "Anyone can upload job application files" ON storage.objects;
    CREATE POLICY "Anyone can upload job application files"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'job-applications');
  END IF;
END $$;

-- Allow admins to update job application files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can update job application files'
  ) THEN
    CREATE POLICY "Admins can update job application files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    DROP POLICY IF EXISTS "Admins can update job application files" ON storage.objects;
    CREATE POLICY "Admins can update job application files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Allow admins to delete job application files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can delete job application files'
  ) THEN
    CREATE POLICY "Admins can delete job application files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  ELSE
    DROP POLICY IF EXISTS "Admins can delete job application files" ON storage.objects;
    CREATE POLICY "Admins can delete job application files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'job-applications'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

