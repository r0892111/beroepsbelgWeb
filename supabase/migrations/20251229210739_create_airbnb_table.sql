/*
  # Create airbnb table

  1. Changes
    - Create airbnb table to store AirBNB listing data
    - Add columns: id, url, price, title, image_url, created_at, updated_at
    - Enable RLS and create policies for public read and admin write

  2. Notes
    - image_url stores Supabase Storage URL from airbnb-images bucket
    - price is stored as NUMERIC with 2 decimal places
    - created_at and updated_at are automatically managed
*/

-- Create airbnb table
CREATE TABLE IF NOT EXISTS airbnb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  price NUMERIC(10, 2),
  title TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_airbnb_created_at ON airbnb(created_at DESC);

-- Enable RLS
ALTER TABLE airbnb ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view airbnb listings" ON airbnb;
DROP POLICY IF EXISTS "Admins can insert airbnb listings" ON airbnb;
DROP POLICY IF EXISTS "Admins can update airbnb listings" ON airbnb;
DROP POLICY IF EXISTS "Admins can delete airbnb listings" ON airbnb;

-- Policy: Public can view airbnb listings
CREATE POLICY "Public can view airbnb listings"
  ON airbnb FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Admins can insert airbnb listings
CREATE POLICY "Admins can insert airbnb listings"
  ON airbnb FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Policy: Admins can update airbnb listings
CREATE POLICY "Admins can update airbnb listings"
  ON airbnb FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Policy: Admins can delete airbnb listings
CREATE POLICY "Admins can delete airbnb listings"
  ON airbnb FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Add comment for documentation
COMMENT ON TABLE airbnb IS 'Stores AirBNB listing information with images';
COMMENT ON COLUMN airbnb.url IS 'AirBNB listing URL';
COMMENT ON COLUMN airbnb.price IS 'Price per night (NUMERIC with 2 decimal places)';
COMMENT ON COLUMN airbnb.title IS 'Title of the AirBNB listing';
COMMENT ON COLUMN airbnb.image_url IS 'Supabase Storage URL for uploaded image from airbnb-images bucket';


