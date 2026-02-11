/*
  # Add city_id to lectures table

  1. Changes
    - Add city_id column to lectures table to link lectures to cities
    - Add foreign key constraint to cities table
    - Add index for performance

  2. Notes
    - Lectures can now be filtered by city
    - city_id is nullable to allow lectures without a specific city
*/

-- Add city_id column to lectures table
ALTER TABLE lectures
ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_lectures_city_id ON lectures(city_id);

-- Add comment for documentation
COMMENT ON COLUMN lectures.city_id IS 'Foreign key to cities table. Links lecture to a specific city.';
