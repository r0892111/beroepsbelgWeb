/*
  # Add display_order and category_display_order columns to webshop_data table

  1. Changes
    - Add display_order INTEGER column for global ordering of products
    - Add category_display_order INTEGER column for per-category ordering
    - Create indexes for efficient sorting
    - Initialize display_order for existing products based on Name alphabetical order
    - Initialize category_display_order for existing products grouped by Category

  2. Notes
    - display_order is global, so all products are ordered together
    - category_display_order is per-category, so each category's products are ordered independently
    - Products without display_order will fall back to category_display_order, then Name ordering (NULLS LAST)
    - The indexes ensure efficient queries when sorting
*/

-- Add display_order and category_display_order columns to webshop_data
ALTER TABLE webshop_data
ADD COLUMN IF NOT EXISTS display_order INTEGER,
ADD COLUMN IF NOT EXISTS category_display_order INTEGER;

-- Create indexes for efficient sorting
CREATE INDEX IF NOT EXISTS idx_webshop_display_order 
ON webshop_data(display_order);

CREATE INDEX IF NOT EXISTS idx_webshop_category_display_order 
ON webshop_data("Category", category_display_order);

-- Initialize display_order for existing products
-- Set order based on current Name alphabetical order (global)
DO $$
DECLARE
  product_record RECORD;
  order_num INTEGER;
BEGIN
  order_num := 1;
  FOR product_record IN 
    SELECT uuid FROM webshop_data 
    ORDER BY "Name" ASC
  LOOP
    UPDATE webshop_data 
    SET display_order = order_num 
    WHERE uuid = product_record.uuid;
    order_num := order_num + 1;
  END LOOP;
END $$;

-- Initialize category_display_order for existing products
-- Set order based on current Name alphabetical order, grouped by Category
DO $$
DECLARE
  category_name TEXT;
  product_record RECORD;
  order_num INTEGER;
BEGIN
  FOR category_name IN SELECT DISTINCT "Category" FROM webshop_data WHERE "Category" IS NOT NULL LOOP
    order_num := 1;
    FOR product_record IN 
      SELECT uuid FROM webshop_data 
      WHERE "Category" = category_name 
      ORDER BY "Name" ASC
    LOOP
      UPDATE webshop_data 
      SET category_display_order = order_num 
      WHERE uuid = product_record.uuid;
      order_num := order_num + 1;
    END LOOP;
  END LOOP;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN webshop_data.display_order IS 'Global display order for products. Lower numbers appear first. NULL values fall back to category_display_order, then Name ordering.';
COMMENT ON COLUMN webshop_data.category_display_order IS 'Per-category display order for products. Lower numbers appear first within each category. NULL values fall back to Name ordering within category.';


