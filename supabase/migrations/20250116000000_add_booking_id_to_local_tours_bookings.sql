/*
  # Add booking_id to local_tours_bookings
  
  1. Changes
    - Add `booking_id` column to `local_tours_bookings` table
    - References `tourbooking.id` (integer)
    - Allows fetching the parent booking entry
    - Nullable since slots can exist without bookings initially
  
  2. Notes
    - This links the slot to the most recent booking
    - Multiple bookings can exist per slot, but this stores the latest one
*/

-- Add booking_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'local_tours_bookings' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE local_tours_bookings 
    ADD COLUMN booking_id integer REFERENCES tourbooking(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_local_tours_bookings_booking_id 
ON local_tours_bookings(booking_id);

