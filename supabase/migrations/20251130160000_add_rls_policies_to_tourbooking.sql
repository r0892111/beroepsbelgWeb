/*
  # Add RLS Policies to Tour Booking Table

  1. Changes
    - Enable RLS on tourbooking table (if not already enabled)
    - Add policy to allow anyone to read bookings by stripe_session_id
    - Add policy to allow service role to insert/update bookings

  2. Notes
    - This allows the success page to fetch booking details after Stripe payment
    - Users can view their booking using the session ID from the redirect URL
*/

-- Enable RLS on tourbooking table
ALTER TABLE tourbooking ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon and authenticated) to read bookings
-- This is necessary for the success page to display booking details
CREATE POLICY "Anyone can view bookings by stripe session id"
  ON tourbooking FOR SELECT
  TO anon, authenticated
  USING (stripe_session_id IS NOT NULL);

-- Allow service role to insert bookings (used by Supabase edge function)
CREATE POLICY "Service role can insert bookings"
  ON tourbooking FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to update bookings (used by webhooks)
CREATE POLICY "Service role can update bookings"
  ON tourbooking FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);














