/*
  # Fix Admin RLS Policies to Check Both isAdmin and is_admin Fields

  1. Changes
    - Update admin RLS policies to check both isAdmin and is_admin fields
    - This ensures compatibility with profiles that have either field set

  2. Notes
    - Some profiles may have isAdmin (capital A) while others have is_admin (lowercase)
    - This migration updates all admin policies to check both fields
*/

-- Drop existing admin policies for tourbooking
DROP POLICY IF EXISTS "Admins can insert bookings" ON tourbooking;
DROP POLICY IF EXISTS "Admins can update bookings" ON tourbooking;
DROP POLICY IF EXISTS "Admins can delete bookings" ON tourbooking;

-- Policy: Admins can insert bookings (check both isAdmin and is_admin)
CREATE POLICY "Admins can insert bookings"
  ON tourbooking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can update bookings (check both isAdmin and is_admin)
CREATE POLICY "Admins can update bookings"
  ON tourbooking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can delete bookings (check both isAdmin and is_admin)
CREATE POLICY "Admins can delete bookings"
  ON tourbooking FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Drop existing admin policies for local_tours_bookings
DROP POLICY IF EXISTS "Admins can insert local tours bookings" ON local_tours_bookings;
DROP POLICY IF EXISTS "Admins can update local tours bookings" ON local_tours_bookings;
DROP POLICY IF EXISTS "Admins can delete local tours bookings" ON local_tours_bookings;

-- Policy: Admins can insert local_tours_bookings (check both isAdmin and is_admin)
CREATE POLICY "Admins can insert local tours bookings"
  ON local_tours_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can update local_tours_bookings (check both isAdmin and is_admin)
CREATE POLICY "Admins can update local tours bookings"
  ON local_tours_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can delete local_tours_bookings (check both isAdmin and is_admin)
CREATE POLICY "Admins can delete local tours bookings"
  ON local_tours_bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );
