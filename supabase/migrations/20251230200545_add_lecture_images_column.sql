/*
  # Add lecture_images JSONB column to lectures table

  1. Changes
    - Add lecture_images JSONB column to store array of lecture images
    - Each image object contains: id, image_url, is_primary, sort_order, storage_folder_name, created_at, updated_at
    - Similar structure to tour_images in tours table

  2. Notes
    - Images are stored as JSONB array directly in lectures table
    - Allows multiple images per lecture with primary image selection
    - Primary image URL is accessible in JSONB for display
*/

-- Add lecture_images JSONB column
ALTER TABLE lectures 
ADD COLUMN IF NOT EXISTS lecture_images jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN lectures.lecture_images IS 'Array of lecture images stored as JSONB. Each image has: id, lecture_id, image_url (public URL), is_primary (boolean), sort_order (integer), storage_folder_name (text), created_at, updated_at';

