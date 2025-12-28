/*
  # Add display_order column to tours_table_prod table

  1. Changes
    - Add display_order INTEGER column to allow per-city ordering of tours
    - Create index for efficient sorting by city and display_order
    - Initialize display_order for existing tours based on created_at order, grouped by city

  2. Notes
    - display_order is per-city, so each city's tours are ordered independently
    - Tours without display_order will fall back to created_at ordering (NULLS LAST)
    - The index ensures efficient queries when filtering and sorting by city
*/

-- Add display_order column to tours_table_prod
ALTER TABLE tours_table_prod
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_tours_display_order_city 
ON tours_table_prod(city, display_order);

-- Initialize display_order for existing tours
-- Set order based on current created_at order, grouped by city
DO $$
DECLARE
  city_name TEXT;
  tour_record RECORD;
  order_num INTEGER;
BEGIN
  FOR city_name IN SELECT DISTINCT city FROM tours_table_prod LOOP
    order_num := 1;
    FOR tour_record IN 
      SELECT id FROM tours_table_prod 
      WHERE city = city_name 
      ORDER BY created_at ASC
    LOOP
      UPDATE tours_table_prod 
      SET display_order = order_num 
      WHERE id = tour_record.id;
      order_num := order_num + 1;
    END LOOP;
  END LOOP;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN tours_table_prod.display_order IS 'Display order for tours within each city. Lower numbers appear first. NULL values fall back to created_at ordering.';

