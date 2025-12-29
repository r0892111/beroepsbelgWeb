/*
  # Add city_id foreign key to tours_table_prod table

  1. Changes
    - Add city_id UUID column to tours_table_prod
    - Add foreign key constraint to cities.id
    - Migrate existing data by matching city names to city IDs
    - Create index for efficient queries
    - Keep city column for backward compatibility (can be removed later)

  2. Notes
    - city_id provides a reliable foreign key relationship
    - Existing tours are matched by city name to cities.name_nl
    - Tours without matching cities will have NULL city_id (should be fixed manually)
*/

-- Add city_id column
ALTER TABLE tours_table_prod
ADD COLUMN IF NOT EXISTS city_id uuid;

-- Add foreign key constraint
ALTER TABLE tours_table_prod
ADD CONSTRAINT tours_table_prod_city_id_fkey 
FOREIGN KEY (city_id) 
REFERENCES cities(id) 
ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tours_city_id 
ON tours_table_prod(city_id);

-- Migrate existing data: match city names to city IDs
UPDATE tours_table_prod t
SET city_id = c.id
FROM cities c
WHERE (LOWER(TRIM(t.city)) = LOWER(TRIM(c.name_nl))
   OR LOWER(TRIM(t.city)) = LOWER(TRIM(c.name_en))
   OR LOWER(TRIM(t.city)) = LOWER(TRIM(c.name_fr))
   OR LOWER(TRIM(t.city)) = LOWER(TRIM(c.name_de)))
   AND t.city_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN tours_table_prod.city_id IS 'Foreign key to cities table. Provides reliable relationship instead of string matching.';

