/*
  # Create lectures table with RLS policies

  1. Changes
    - Create lectures table for storing lecture information (Dutch-only content)
    - Add all necessary fields: title, date, location, group_size, description1, description2, description
    - Add display_order for custom ordering
    - Enable RLS with policies for public read and admin write access

  2. Notes
    - All content fields are in Dutch only
    - Public users can read all lectures
    - Only authenticated admins can create, update, or delete lectures
*/

-- Create lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date text,
  location text,
  group_size text,
  description1 text,
  description2 text,
  description text,
  display_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can view lectures" ON lectures;
DROP POLICY IF EXISTS "Admins can insert lectures" ON lectures;
DROP POLICY IF EXISTS "Admins can update lectures" ON lectures;
DROP POLICY IF EXISTS "Admins can delete lectures" ON lectures;

-- Allow everyone to view lectures (for public display on /lezing page)
CREATE POLICY "Anyone can view lectures"
  ON lectures FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to insert lectures
CREATE POLICY "Admins can insert lectures"
  ON lectures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Allow admins to update lectures
CREATE POLICY "Admins can update lectures"
  ON lectures FOR UPDATE
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

-- Allow admins to delete lectures
CREATE POLICY "Admins can delete lectures"
  ON lectures FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_lectures_display_order ON lectures(display_order);

-- Add comment for documentation
COMMENT ON TABLE lectures IS 'Stores lecture information. All content is in Dutch only.';
COMMENT ON COLUMN lectures.title IS 'Lecture title in Dutch';
COMMENT ON COLUMN lectures.date IS 'Date display text (e.g., "Op aanvraag")';
COMMENT ON COLUMN lectures.location IS 'Location in Dutch';
COMMENT ON COLUMN lectures.group_size IS 'Group size text in Dutch (e.g., "10-50 personen")';
COMMENT ON COLUMN lectures.description1 IS 'First description paragraph in Dutch';
COMMENT ON COLUMN lectures.description2 IS 'Second description paragraph in Dutch';
COMMENT ON COLUMN lectures.description IS 'Full description in Dutch (for expanded view)';
COMMENT ON COLUMN lectures.display_order IS 'Custom ordering for lectures (lower numbers appear first)';

