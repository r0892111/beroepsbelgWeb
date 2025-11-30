/*
  # Add Stripe Session ID to Tour Booking Table

  1. Changes
    - Add `stripe_session_id` column to `tourbooking` table
    - Column is nullable to support existing records and non-Stripe bookings
    - Add index on `stripe_session_id` for fast lookups during webhook processing

  2. Notes
    - This column stores the Stripe checkout session ID for tracking payments
    - Used to match Stripe payment confirmations with bookings
    - Nullable to support bookings created through other channels
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN stripe_session_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tourbooking_stripe_session_id ON tourbooking(stripe_session_id);
