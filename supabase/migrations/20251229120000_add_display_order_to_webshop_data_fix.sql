/*
  # Add display_order and category_display_order columns to webshop_data table (Fix)
  
  This migration safely adds the columns if they don't exist, regardless of previous migration status.
*/

-- Add display_order and category_display_order columns to webshop_data (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'webshop_data' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE webshop_data ADD COLUMN display_order INTEGER;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'webshop_data' AND column_name = 'category_display_order'
  ) THEN
    ALTER TABLE webshop_data ADD COLUMN category_display_order INTEGER;
  END IF;
END $$;

-- Create indexes for efficient sorting (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_webshop_display_order 
ON webshop_data(display_order);

CREATE INDEX IF NOT EXISTS idx_webshop_category_display_order 
ON webshop_data("Category", category_display_order);

-- Initialize display_order for existing products that don't have it
-- Set order based on current Name alphabetical order (global)
DO $$
DECLARE
  product_record RECORD;
  order_num INTEGER;
BEGIN
  -- Only initialize if there are products without display_order
  IF EXISTS (SELECT 1 FROM webshop_data WHERE display_order IS NULL) THEN
    order_num := 1;
    FOR product_record IN 
      SELECT uuid FROM webshop_data 
      WHERE display_order IS NULL
      ORDER BY "Name" ASC
    LOOP
      UPDATE webshop_data 
      SET display_order = order_num 
      WHERE uuid = product_record.uuid;
      order_num := order_num + 1;
    END LOOP;
  END IF;
END $$;

-- Initialize category_display_order for existing products that don't have it
-- Set order based on current Name alphabetical order, grouped by Category
DO $$
DECLARE
  category_name TEXT;
  product_record RECORD;
  order_num INTEGER;
BEGIN
  FOR category_name IN SELECT DISTINCT "Category" FROM webshop_data WHERE "Category" IS NOT NULL LOOP
    -- Only initialize if there are products in this category without category_display_order
    IF EXISTS (SELECT 1 FROM webshop_data WHERE "Category" = category_name AND category_display_order IS NULL) THEN
      order_num := 1;
      FOR product_record IN 
        SELECT uuid FROM webshop_data 
        WHERE "Category" = category_name AND category_display_order IS NULL
        ORDER BY "Name" ASC
      LOOP
        UPDATE webshop_data 
        SET category_display_order = order_num 
        WHERE uuid = product_record.uuid;
        order_num := order_num + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN webshop_data.display_order IS 'Global display order for products. Lower numbers appear first. NULL values fall back to category_display_order, then Name ordering.';
COMMENT ON COLUMN webshop_data.category_display_order IS 'Per-category display order for products. Lower numbers appear first within each category. NULL values fall back to Name ordering within category.';


