/*
  # Add guide_ids array column to tourbooking table for multiple guides

  1. Changes
    - Add `guide_ids` integer[] column to `tourbooking` table to store multiple guide IDs
    - Column is nullable to support existing records
    - Keep `guide_id` for backward compatibility (single accepted guide)
    - Add index for faster lookups

  2. Notes
    - `guide_id` remains for single accepted guide (backward compatibility)
    - `guide_ids` stores array of all assigned guide IDs
    - `selectedGuides` jsonb[] already exists for guide selection workflow
    - This allows multiple guides to be assigned to a single booking
*/

-- Add guide_ids array column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'guide_ids'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN guide_ids integer[];
  END IF;
END $$;

-- Create index for faster lookups using GIN index for array operations
CREATE INDEX IF NOT EXISTS idx_tourbooking_guide_ids ON tourbooking USING GIN (guide_ids);

-- Add comment for documentation
COMMENT ON COLUMN tourbooking.guide_ids IS 'Array of guide IDs assigned to this booking. Allows multiple guides per booking.';
