/*
  # Add display_order column to cities table

  1. Changes
    - Add display_order INTEGER column to allow ordering of cities on /tours page
    - Create index for efficient sorting by display_order
    - Initialize display_order for existing cities based on slug order

  2. Notes
    - display_order is global, lower numbers appear first
    - Cities without display_order will fall back to slug ordering (NULLS LAST)
    - The index ensures efficient queries when sorting cities
*/

-- Add display_order column to cities table
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_cities_display_order 
ON cities(display_order);

-- Initialize display_order for existing cities
-- Set order based on current slug order
DO $$
DECLARE
  city_record RECORD;
  order_num INTEGER;
BEGIN
  order_num := 1;
  FOR city_record IN 
    SELECT slug FROM cities 
    ORDER BY slug ASC
  LOOP
    UPDATE cities 
    SET display_order = order_num 
    WHERE slug = city_record.slug;
    order_num := order_num + 1;
  END LOOP;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN cities.display_order IS 'Display order for cities on the /tours page. Lower numbers appear first. NULL values fall back to slug ordering.';

