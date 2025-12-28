/*
  # Create City Images Table

  1. New Tables
    - `city_images`
      - `id` (uuid, primary key)
      - `city_id` (text, unique) - City identifier matching CitySection (e.g., 'antwerp', 'gent')
      - `photo_url` (text, nullable) - URL for the main city photo
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on city_images table
    - Anyone can view city images (for public display)
    - Only admins can create/update/delete city images

  3. Indexes
    - Index on city_id for fast lookups
*/

-- Create city_images table
CREATE TABLE IF NOT EXISTS city_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text UNIQUE NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE city_images ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view city images
CREATE POLICY "Anyone can view city images"
  ON city_images FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to insert city images
CREATE POLICY "Admins can insert city images"
  ON city_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Allow admins to update city images
CREATE POLICY "Admins can update city images"
  ON city_images FOR UPDATE
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

-- Allow admins to delete city images
CREATE POLICY "Admins can delete city images"
  ON city_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_city_images_city_id ON city_images(city_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_city_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_city_images_updated_at
  BEFORE UPDATE ON city_images
  FOR EACH ROW
  EXECUTE FUNCTION update_city_images_updated_at();

