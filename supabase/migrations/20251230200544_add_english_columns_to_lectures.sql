/*
  # Add English columns to lectures table

  1. Changes
    - Add English language columns for all content fields
    - All columns are nullable to allow gradual migration
    - Supports bilingual lectures (Dutch and English)

  2. Notes
    - Lectures now support both Dutch and English content
    - English fields mirror the Dutch field structure
*/

-- Add English columns to lectures table
ALTER TABLE lectures
ADD COLUMN IF NOT EXISTS title_en text,
ADD COLUMN IF NOT EXISTS date_en text,
ADD COLUMN IF NOT EXISTS location_en text,
ADD COLUMN IF NOT EXISTS group_size_en text,
ADD COLUMN IF NOT EXISTS description1_en text,
ADD COLUMN IF NOT EXISTS description2_en text,
ADD COLUMN IF NOT EXISTS description_en text;

-- Add comments for documentation
COMMENT ON COLUMN lectures.title_en IS 'Lecture title in English';
COMMENT ON COLUMN lectures.date_en IS 'Date display text in English (e.g., "On request")';
COMMENT ON COLUMN lectures.location_en IS 'Location in English';
COMMENT ON COLUMN lectures.group_size_en IS 'Group size text in English (e.g., "10-50 people")';
COMMENT ON COLUMN lectures.description1_en IS 'First description paragraph in English';
COMMENT ON COLUMN lectures.description2_en IS 'Second description paragraph in English';
COMMENT ON COLUMN lectures.description_en IS 'Full description in English (for expanded view)';

