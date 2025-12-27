/*
  # Add product_images JSONB column to webshop_data table

  1. Changes
    - Add product_images JSONB column to store array of product images
    - Each image object contains: id, url, is_primary, sort_order, storage_folder_name, created_at, updated_at

  2. Notes
    - This replaces the need for a separate product_images table
    - Images are stored as JSONB array directly in webshop_data
    - Allows multiple images per product with primary image selection
*/

-- Add product_images JSONB column
ALTER TABLE webshop_data 
ADD COLUMN IF NOT EXISTS product_images jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN webshop_data.product_images IS 'Array of product images stored as JSONB. Each image has: id, url, is_primary (boolean), sort_order (integer), storage_folder_name (text), created_at, updated_at';

-- Storage policies for WebshopItemsImages bucket (if not already set)
-- Note: These policies may already exist, but adding them here ensures they're in place

-- Enable public read access for the WebshopItemsImages bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'WebshopItemsImages');
  END IF;
END $$;

-- Allow admins to upload product images (including to new folders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can upload product images'
  ) THEN
    CREATE POLICY "Admins can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'WebshopItemsImages'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Note: Folder creation is handled by the INSERT policy above
-- When uploading to a new path (e.g., "FolderName/filename.jpg"), 
-- Supabase Storage automatically creates the folder structure

-- Allow admins to update product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can update product images'
  ) THEN
    CREATE POLICY "Admins can update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'WebshopItemsImages'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    )
    WITH CHECK (
      bucket_id = 'WebshopItemsImages'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

-- Allow admins to delete product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can delete product images'
  ) THEN
    CREATE POLICY "Admins can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'WebshopItemsImages'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.isAdmin = true OR profiles.is_admin = true)
      )
    );
  END IF;
END $$;

