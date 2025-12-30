/*
  # Create lecture_bookings table with RLS policies

  1. Changes
    - Create lecture_bookings table for storing lecture booking form submissions
    - Add all necessary fields: name, phone, email, preferred_date, number_of_people, location_description, needs_room_provided
    - Enable RLS with policies for public insert and admin access
    - Add check constraint to ensure at least one of phone or email is provided

  2. Notes
    - Public users can submit booking forms (INSERT)
    - Only authenticated admins can view, update, or delete bookings
    - At least one contact method (phone or email) is required
*/

-- Create lecture_bookings table
CREATE TABLE IF NOT EXISTS lecture_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES lectures(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  preferred_date date,
  number_of_people integer,
  location_description text,
  needs_room_provided boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure at least one of phone or email is provided
  CONSTRAINT check_contact_info CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE lecture_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can submit lecture bookings" ON lecture_bookings;
DROP POLICY IF EXISTS "Admins can view lecture bookings" ON lecture_bookings;
DROP POLICY IF EXISTS "Admins can update lecture bookings" ON lecture_bookings;
DROP POLICY IF EXISTS "Admins can delete lecture bookings" ON lecture_bookings;

-- Allow anyone to submit booking forms (for public form submissions)
CREATE POLICY "Anyone can submit lecture bookings"
  ON lecture_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow admins to view all bookings
CREATE POLICY "Admins can view lecture bookings"
  ON lecture_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Allow admins to update bookings
CREATE POLICY "Admins can update lecture bookings"
  ON lecture_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Allow admins to delete bookings
CREATE POLICY "Admins can delete lecture bookings"
  ON lecture_bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Create index on lecture_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_lecture_bookings_lecture_id ON lecture_bookings(lecture_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_lecture_bookings_status ON lecture_bookings(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_lecture_bookings_created_at ON lecture_bookings(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE lecture_bookings IS 'Stores lecture booking form submissions from the public lecture page';
COMMENT ON COLUMN lecture_bookings.lecture_id IS 'Optional reference to specific lecture (nullable for general inquiries)';
COMMENT ON COLUMN lecture_bookings.needs_room_provided IS 'Whether the requester needs BeroepsBelg to provide a room/auditorium';
COMMENT ON COLUMN lecture_bookings.status IS 'Booking status: pending, confirmed, or cancelled';

