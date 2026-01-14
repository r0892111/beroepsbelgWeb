/*
  Create pending_tour_bookings table for storing booking data before payment confirmation.

  This table holds all booking details temporarily until the Stripe webhook confirms payment.
  After successful payment, the webhook creates the actual tourbooking record and deletes
  the pending entry.

  Benefits:
  - No orphaned bookings if user cancels at Stripe checkout
  - No character limit issues (all data stored in JSONB)
  - Clean separation of pending vs confirmed bookings
  - Easy cleanup of abandoned pending bookings
*/

CREATE TABLE IF NOT EXISTS pending_tour_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  booking_data jsonb NOT NULL,
  tour_type text NOT NULL CHECK (tour_type IN ('standard', 'op_maat', 'local_stories', 'b2b')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '2 hours')
);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_pending_tour_bookings_expires ON pending_tour_bookings(expires_at);

-- Index for lookup by stripe_session_id
CREATE INDEX IF NOT EXISTS idx_pending_tour_bookings_session ON pending_tour_bookings(stripe_session_id);

-- Enable RLS
ALTER TABLE pending_tour_bookings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
  ON pending_tour_bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon/authenticated to SELECT by stripe_session_id (for success page polling)
CREATE POLICY "Anyone can view pending by session"
  ON pending_tour_bookings
  FOR SELECT
  TO anon, authenticated
  USING (true);
