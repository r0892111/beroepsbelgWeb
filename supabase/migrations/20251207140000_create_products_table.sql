/*
  # Create Products Table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly identifier
      - `title_nl` (text) - Dutch title
      - `title_en` (text) - English title
      - `title_fr` (text) - French title
      - `title_de` (text) - German title
      - `category` (text) - Product category (Book, Merchandise, Game)
      - `price` (numeric) - Product price in euros
      - `description_nl` (text) - Dutch description
      - `description_en` (text) - English description
      - `description_fr` (text) - French description
      - `description_de` (text) - German description
      - `additional_info_nl` (text, nullable) - Additional Dutch info
      - `additional_info_en` (text, nullable) - Additional English info
      - `additional_info_fr` (text, nullable) - Additional French info
      - `additional_info_de` (text, nullable) - Additional German info
      - `label` (text, nullable) - Optional label (e.g., "BESTSELLER", "NEW")
      - `image` (text, nullable) - Image URL
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on products table
    - Anyone can view products
    - Only admins can create/update/delete products

  3. Indexes
    - Index on slug for fast lookups
    - Index on category for filtering
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_nl text NOT NULL,
  title_en text NOT NULL,
  title_fr text NOT NULL,
  title_de text NOT NULL,
  category text NOT NULL CHECK (category IN ('Book', 'Merchandise', 'Game')),
  price numeric NOT NULL CHECK (price >= 0),
  description_nl text NOT NULL,
  description_en text NOT NULL,
  description_fr text NOT NULL,
  description_de text NOT NULL,
  additional_info_nl text,
  additional_info_en text,
  additional_info_fr text,
  additional_info_de text,
  label text,
  image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view products
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to insert products
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Allow admins to update products
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
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

-- Allow admins to delete products
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();






