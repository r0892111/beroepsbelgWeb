/*
  # Add Stripe Session ID to Local Tours Bookings Table

  1. Changes
    - Add `stripe_session_id` column to `local_tours_bookings` table if it doesn't exist
    - Column is nullable to support existing records
    - Add index on `stripe_session_id` for fast lookups during webhook processing and success page queries

  2. Notes
    - This column stores the Stripe checkout session ID for tracking payments
    - Used to match Stripe payment confirmations with local tours bookings
    - Nullable to support bookings created through other channels
    - This migration is idempotent - it won't fail if the column already exists
*/

-- Add stripe_session_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'local_tours_bookings' 
      AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE local_tours_bookings ADD COLUMN stripe_session_id text;
    RAISE NOTICE 'Added stripe_session_id column to local_tours_bookings';
  ELSE
    RAISE NOTICE 'stripe_session_id column already exists in local_tours_bookings';
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_local_tours_bookings_stripe_session_id 
ON local_tours_bookings(stripe_session_id);


