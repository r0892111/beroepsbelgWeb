/*
  # Add Booking Type to Tour Booking Table

  1. Changes
    - Add `booking_type` column to `tourbooking` table
    - Values: 'B2C' (consumer booking via website) or 'B2B' (business booking)
    - Default is 'B2C' for backwards compatibility

  2. Notes
    - B2C bookings come through Stripe checkout
    - B2B bookings may come through external integrations (n8n)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN booking_type text DEFAULT 'B2C';
  END IF;
END $$;

-- Add check constraint to ensure valid booking types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tourbooking' AND constraint_name = 'tourbooking_booking_type_check'
  ) THEN
    ALTER TABLE tourbooking ADD CONSTRAINT tourbooking_booking_type_check 
      CHECK (booking_type IN ('B2C', 'B2B'));
  END IF;
END $$;

-- Create index for filtering by booking type
CREATE INDEX IF NOT EXISTS idx_tourbooking_booking_type ON tourbooking(booking_type);



