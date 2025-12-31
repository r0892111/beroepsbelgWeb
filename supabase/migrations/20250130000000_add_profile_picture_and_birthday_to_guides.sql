/*
  # Add profile_picture and birthday columns to guides_temp table

  1. Changes
    - Add profile_picture TEXT column to store image URL
    - Add birthday DATE column to store guide's birthday
    - Both columns are nullable to support existing guides

  2. Notes
    - profile_picture stores the URL to the uploaded profile picture in Supabase Storage
    - birthday stores the guide's date of birth
    - Existing guides will have NULL values for these fields
*/

-- Add profile_picture column
ALTER TABLE guides_temp
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add birthday column
ALTER TABLE guides_temp
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add comments for documentation
COMMENT ON COLUMN guides_temp.profile_picture IS 'URL to the guide profile picture stored in Supabase Storage';
COMMENT ON COLUMN guides_temp.birthday IS 'Date of birth of the guide';

