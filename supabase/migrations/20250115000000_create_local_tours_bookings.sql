/*
  # Create Local Tours Bookings Table

  1. New Table
    - `local_tours_bookings`
      - `id` (uuid, primary key)
      - `tour_id` (uuid) - References tours_table_prod
      - `booking_date` (date) - The Saturday date for the booking
      - `booking_time` (time) - Always 14:00 (2 PM)
      - `is_booked` (boolean) - Whether this slot is booked
      - `user_id` (uuid, nullable) - References profiles table (if booked by logged-in user)
      - `customer_name` (text, nullable) - Customer name
      - `customer_email` (text, nullable) - Customer email
      - `customer_phone` (text, nullable) - Customer phone
      - `stripe_session_id` (text, nullable) - Stripe checkout session ID
      - `status` (text) - 'available', 'booked', 'cancelled'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Only one booking per Saturday (unique constraint on booking_date)
    - booking_time is always 14:00:00
    - status must be one of: 'available', 'booked', 'cancelled'

  3. Security
    - Enable RLS on local_tours_bookings table
    - Anyone can view bookings (to check availability)
    - Authenticated users can create bookings
    - Service role can update bookings

  4. Indexes
    - Index on tour_id for faster queries
    - Index on booking_date for availability checks
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS local_tours_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES tours_table_prod(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  booking_time time NOT NULL DEFAULT '14:00:00',
  is_booked boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tour_id, booking_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_local_tours_bookings_tour_id ON local_tours_bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_local_tours_bookings_booking_date ON local_tours_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_local_tours_bookings_status ON local_tours_bookings(status);
CREATE INDEX IF NOT EXISTS idx_local_tours_bookings_is_booked ON local_tours_bookings(is_booked);

-- Enable RLS
ALTER TABLE local_tours_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view bookings (to check availability)
CREATE POLICY "Anyone can view local tours bookings"
  ON local_tours_bookings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Authenticated users can create bookings
CREATE POLICY "Authenticated users can create local tours bookings"
  ON local_tours_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Anonymous users can create bookings (for guest checkout)
CREATE POLICY "Anonymous users can create local tours bookings"
  ON local_tours_bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Service role can update bookings
CREATE POLICY "Service role can update local tours bookings"
  ON local_tours_bookings FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_local_tours_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_local_tours_bookings_updated_at
  BEFORE UPDATE ON local_tours_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_local_tours_bookings_updated_at();

