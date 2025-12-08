/*
  # Add Request Tanguy Column to Tour Bookings

  1. Changes
    - Add `request_tanguy` column to `tourbooking` table
      - Type: boolean
      - Default: false
      - Indicates whether the customer requested Tanguy Ottomer to personally join the tour

  2. Notes
    - Non-nullable with default value to ensure data integrity
    - Existing bookings will default to false (not requested)
*/

-- Add request_tanguy column to tourbooking table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'request_tanguy'
  ) THEN
    ALTER TABLE tourbooking 
    ADD COLUMN request_tanguy boolean DEFAULT false NOT NULL;
  END IF;
END $$;