/*
  # Add themes column to tours_table_prod table

  1. Changes
    - Add themes text[] column to store array of theme tags for tours
    - Default to empty array

  2. Notes
    - Themes are stored as PostgreSQL text array
    - Examples: architecture, fashion, history, food, art, etc.
    - Multiple themes can be assigned to each tour
*/

-- Add themes column to tours_table_prod
ALTER TABLE tours_table_prod
ADD COLUMN IF NOT EXISTS themes text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN tours_table_prod.themes IS 'Array of theme tags for the tour (e.g., architecture, fashion, history, food, art)';

