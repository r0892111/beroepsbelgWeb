/*
  # Add amnt_of_people to local_tours_bookings
  
  1. Changes
    - Add `amnt_of_people` column to `local_tours_bookings` table
    - Stores the number of people for this specific booking
    - Integer, nullable (defaults to null)
  
  2. Notes
    - This stores the amount directly in the local_tours_bookings entry
    - Different from number_of_people which is calculated from all bookings
*/

-- Add amnt_of_people column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'local_tours_bookings' AND column_name = 'amnt_of_people'
  ) THEN
    ALTER TABLE local_tours_bookings 
    ADD COLUMN amnt_of_people integer;
  END IF;
END $$;





