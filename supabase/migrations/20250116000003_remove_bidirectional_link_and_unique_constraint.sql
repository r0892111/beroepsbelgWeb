/*
  # Remove bidirectional link and unique constraint for one-to-many relationship
  
  1. Changes
    - Remove `local_tours_booking_id` column from `tourbooking` table
    - Remove unique constraint on `(tour_id, booking_date)` from `local_tours_bookings`
    - This allows multiple `local_tours_bookings` entries per Saturday (one-to-many: tourbooking -> local_tours_bookings)
  
  2. Notes
    - Multiple people can now book the same Saturday
    - Each booking creates a new `local_tours_bookings` entry
    - All `local_tours_bookings` entries for the same Saturday reference different `tourbooking` entries via `booking_id`
*/

-- Remove local_tours_booking_id column from tourbooking if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'local_tours_booking_id'
  ) THEN
    -- Drop the index first
    DROP INDEX IF EXISTS idx_tourbooking_local_tours_booking_id;
    
    -- Drop the column
    ALTER TABLE tourbooking 
    DROP COLUMN local_tours_booking_id;
  END IF;
END $$;

-- Remove unique constraint on (tour_id, booking_date) from local_tours_bookings
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'local_tours_bookings_tour_id_booking_date_key'
  ) THEN
    ALTER TABLE local_tours_bookings
    DROP CONSTRAINT local_tours_bookings_tour_id_booking_date_key;
  END IF;
END $$;

-- Note: The booking_id column in local_tours_bookings remains and creates the many-to-one relationship
-- Multiple local_tours_bookings entries can reference the same tourbooking.id via booking_id









