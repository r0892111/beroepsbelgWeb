/*
  # Add storage policies for City Images in WebshopItemsImages bucket

  1. Storage Policies
    - Allow public read access to files in 'City Images' folder
    - Allow authenticated admins to upload files to 'City Images' folder
    - Allow authenticated admins to update/delete files in 'City Images' folder
*/

-- Enable public read access for the City Images folder
CREATE POLICY "Public can view city images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'WebshopItemsImages' 
  AND name LIKE 'City Images/%'
);

-- Allow admins to upload city images
CREATE POLICY "Admins can upload city images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'WebshopItemsImages'
  AND name LIKE 'City Images/%'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.isAdmin = true OR profiles.is_admin = true)
  )
);

-- Allow admins to update city images
CREATE POLICY "Admins can update city images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'WebshopItemsImages'
  AND name LIKE 'City Images/%'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.isAdmin = true OR profiles.is_admin = true)
  )
)
WITH CHECK (
  bucket_id = 'WebshopItemsImages'
  AND name LIKE 'City Images/%'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.isAdmin = true OR profiles.is_admin = true)
  )
);

-- Allow admins to delete city images
CREATE POLICY "Admins can delete city images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'WebshopItemsImages'
  AND name LIKE 'City Images/%'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.isAdmin = true OR profiles.is_admin = true)
  )
);

