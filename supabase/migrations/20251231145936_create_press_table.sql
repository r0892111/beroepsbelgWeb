/*
  # Create press table with RLS policies

  1. Changes
    - Create press table for storing press/media logo information
    - Add fields: image_url, article_url, display_order
    - Enable RLS with policies for public read and admin write access

  2. Notes
    - Public users can read all press items
    - Only authenticated admins can create, update, or delete press items
*/

-- Create press table
CREATE TABLE IF NOT EXISTS press (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  article_url text NOT NULL,
  display_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE press ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can view press" ON press;
DROP POLICY IF EXISTS "Admins can manage press" ON press;

-- Allow everyone to view press items (for public display)
CREATE POLICY "Anyone can view press"
  ON press FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to manage press items (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage press"
  ON press FOR ALL
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

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_press_display_order ON press(display_order);

-- Add comments for documentation
COMMENT ON TABLE press IS 'Stores press/media logo information for display on the homepage.';
COMMENT ON COLUMN press.image_url IS 'Public URL of the press logo image';
COMMENT ON COLUMN press.article_url IS 'URL to the article/press coverage';
COMMENT ON COLUMN press.display_order IS 'Custom ordering for press items (lower numbers appear first)';

