/*
  # Add 'unavailable' status to local_tours_bookings
  
  1. Changes
    - Drop the existing CHECK constraint on status
    - Add new CHECK constraint that includes 'unavailable'
    - This allows admins to mark dates as unavailable
  
  2. Notes
    - Status can now be: 'available', 'booked', 'cancelled', 'unavailable'
    - Unavailable dates will be filtered out from the store page
*/

-- Drop the existing constraint
ALTER TABLE local_tours_bookings
  DROP CONSTRAINT IF EXISTS local_tours_bookings_status_check;

-- Add new constraint with 'unavailable' status
ALTER TABLE local_tours_bookings
  ADD CONSTRAINT local_tours_bookings_status_check
  CHECK (status IN ('available', 'booked', 'cancelled', 'unavailable'));

