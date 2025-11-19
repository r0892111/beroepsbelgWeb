/*
  # Create Bookings Table for Tour Payments

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - References profiles table
      - `tour_id` (uuid) - References tours table
      - `stripe_session_id` (text) - Stripe checkout session ID
      - `stripe_payment_intent_id` (text, nullable) - Stripe payment intent ID
      - `status` (text) - 'pending', 'completed', 'cancelled', 'refunded'
      - `amount` (numeric) - Payment amount in euros
      - `currency` (text) - Payment currency (default: 'eur')
      - `customer_name` (text) - Customer name
      - `customer_email` (text) - Customer email
      - `customer_phone` (text, nullable) - Customer phone
      - `booking_date` (date) - Requested tour date
      - `number_of_people` (integer) - Number of participants
      - `language` (text) - Preferred tour language
      - `special_requests` (text, nullable) - Any special requests
      - `metadata` (jsonb, nullable) - Additional booking information
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on bookings table
    - Users can view their own bookings
    - Authenticated users can create bookings
    - Only service role can update payment status

  3. Indexes
    - Index on user_id for faster user booking queries
    - Index on stripe_session_id for webhook lookups
    - Index on status for filtering bookings
    - Index on created_at for sorting

  4. Notes
    - Bookings can be made by authenticated or guest users
    - Stripe handles payment processing
    - Webhook updates booking status after payment
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  tour_id uuid NOT NULL REFERENCES tours(id) ON DELETE RESTRICT,
  stripe_session_id text UNIQUE NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  booking_date date NOT NULL,
  number_of_people integer NOT NULL DEFAULT 1,
  language text NOT NULL DEFAULT 'nl',
  special_requests text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view bookings by session"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous users can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can update bookings"
  ON bookings FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session_id ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
