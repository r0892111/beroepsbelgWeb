/*
  # Add RLS policies for cities table

  1. Security
    - Enable RLS on cities table (if not already enabled)
    - Allow public SELECT access (for displaying cities on /tours page)
    - Allow admins to INSERT/UPDATE/DELETE (based on profiles.isAdmin or profiles.is_admin)

  2. Notes
    - Public users need to read cities for the tours page
    - Only authenticated admins can modify city data
*/

-- Enable RLS on cities table (idempotent)
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can view cities" ON cities;
DROP POLICY IF EXISTS "Admins can insert cities" ON cities;
DROP POLICY IF EXISTS "Admins can update cities" ON cities;
DROP POLICY IF EXISTS "Admins can delete cities" ON cities;

-- Allow everyone to view cities (for public display on /tours page)
CREATE POLICY "Anyone can view cities"
  ON cities FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to insert cities
CREATE POLICY "Admins can insert cities"
  ON cities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Allow admins to update cities
CREATE POLICY "Admins can update cities"
  ON cities FOR UPDATE
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

-- Allow admins to delete cities
CREATE POLICY "Admins can delete cities"
  ON cities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

