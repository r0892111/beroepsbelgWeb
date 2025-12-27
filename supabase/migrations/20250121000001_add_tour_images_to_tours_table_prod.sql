/*
  # Add tour_images JSONB column to tours_table_prod table

  1. Changes
    - Add tour_images JSONB column to store array of tour images
    - Each image object contains: id, tour_id, image_url, is_primary, sort_order, storage_folder_name, created_at, updated_at
    - The image_url contains the full public URL for external backend connections (e.g., email templates)

  2. Notes
    - This replaces the need for a separate tour_images table
    - Images are stored as JSONB array directly in tours_table_prod
    - Allows multiple images per tour with primary image selection
    - Primary image URL is accessible in JSONB for external systems
*/

-- Add tour_images JSONB column
ALTER TABLE tours_table_prod 
ADD COLUMN IF NOT EXISTS tour_images jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN tours_table_prod.tour_images IS 'Array of tour images stored as JSONB. Each image has: id, tour_id, image_url (public URL), is_primary (boolean), sort_order (integer), storage_folder_name (text), created_at, updated_at';


