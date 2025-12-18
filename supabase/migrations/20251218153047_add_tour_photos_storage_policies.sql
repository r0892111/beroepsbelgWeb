/*
  # Add storage policies for Tour Photo's bucket

  1. Storage Policies
    - Allow public read access to all files in 'Tour Photo's' bucket
    - This enables city images and tour images to be displayed publicly on the website
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Enable public read access for the Tour Photo's bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'Tour Photo''s');

-- Ensure the bucket is marked as public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'Tour Photo''s';
