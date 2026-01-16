/*
  # Add Admin RLS Policies for Tour Bookings

  1. Changes
    - Add policy for admins to insert bookings (tourbooking)
    - Add policy for admins to update bookings (tourbooking)
    - Add policy for admins to delete bookings (tourbooking)
    - Add policy for admins to insert local_tours_bookings
    - Add policy for admins to update local_tours_bookings
    - Add policy for admins to delete local_tours_bookings

  2. Notes
    - Admin check is done via profiles.isAdmin = true
    - These policies allow the admin panel to manage bookings
*/

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can insert bookings" ON tourbooking;
DROP POLICY IF EXISTS "Admins can update bookings" ON tourbooking;
DROP POLICY IF EXISTS "Admins can delete bookings" ON tourbooking;

-- Policy: Admins can insert bookings
CREATE POLICY "Admins can insert bookings"
  ON tourbooking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  );

-- Policy: Admins can update bookings
CREATE POLICY "Admins can update bookings"
  ON tourbooking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  );

-- Policy: Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
  ON tourbooking FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  );

-- Drop existing policies for local_tours_bookings if they exist
DROP POLICY IF EXISTS "Admins can insert local tours bookings" ON local_tours_bookings;
DROP POLICY IF EXISTS "Admins can update local tours bookings" ON local_tours_bookings;
DROP POLICY IF EXISTS "Admins can delete local tours bookings" ON local_tours_bookings;

-- Policy: Admins can insert local_tours_bookings
CREATE POLICY "Admins can insert local tours bookings"
  ON local_tours_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  );

-- Policy: Admins can update local_tours_bookings
CREATE POLICY "Admins can update local tours bookings"
  ON local_tours_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  );

-- Policy: Admins can delete local_tours_bookings
CREATE POLICY "Admins can delete local tours bookings"
  ON local_tours_bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles."isAdmin" = true
    )
  );
