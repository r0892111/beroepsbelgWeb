/*
  # Add start_location and end_location to tourbooking table

  1. Changes
    - Add `start_location` text column to `tourbooking` table
    - Add `end_location` text column to `tourbooking` table
    - Both columns are nullable to allow existing bookings

  2. Notes
    - These fields allow per-booking customization of start/end locations
    - If not set, the tour's default locations can be used
*/

-- Add start_location column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'start_location'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN start_location text;
  END IF;
END $$;

-- Add end_location column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'end_location'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN end_location text;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN tourbooking.start_location IS 'Custom start location for this specific booking. If null, uses tour default.';
COMMENT ON COLUMN tourbooking.end_location IS 'Custom end location for this specific booking. If null, uses tour default.';
