/*
  # Add local_tours_booking_id to tourbooking
  
  1. Changes
    - Add `local_tours_booking_id` column to `tourbooking` table
    - References `local_tours_bookings.id` (uuid)
    - Creates bidirectional link between tourbooking and local_tours_bookings
    - Nullable since not all bookings are local stories bookings
  
  2. Notes
    - This creates a bidirectional relationship:
      - local_tours_bookings.booking_id → tourbooking.id
      - tourbooking.local_tours_booking_id → local_tours_bookings.id
*/

-- Add local_tours_booking_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'local_tours_booking_id'
  ) THEN
    ALTER TABLE tourbooking 
    ADD COLUMN local_tours_booking_id uuid REFERENCES local_tours_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tourbooking_local_tours_booking_id 
ON tourbooking(local_tours_booking_id);






