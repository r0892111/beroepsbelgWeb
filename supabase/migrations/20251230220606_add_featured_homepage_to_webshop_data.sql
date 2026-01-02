/*
  # Add Featured Homepage Fields to webshop_data

  1. Changes
    - Add featured_on_homepage boolean column (default false)
    - Add homepage_featured_order integer column (nullable)
    - Create index for efficient queries
    - Add comments for documentation

  2. Notes
    - featured_on_homepage determines if product appears in homepage ShopSection
    - homepage_featured_order controls display order on homepage (lower numbers first)
*/

-- Add columns to webshop_data
ALTER TABLE webshop_data
ADD COLUMN IF NOT EXISTS featured_on_homepage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS homepage_featured_order integer;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_webshop_featured_homepage 
ON webshop_data(featured_on_homepage, homepage_featured_order);

-- Add comments for documentation
COMMENT ON COLUMN webshop_data.featured_on_homepage IS 'Whether this product should be displayed in the homepage ShopSection';
COMMENT ON COLUMN webshop_data.homepage_featured_order IS 'Display order for featured products on homepage. Lower numbers appear first.';

