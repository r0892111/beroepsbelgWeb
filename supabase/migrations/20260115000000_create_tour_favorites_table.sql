/*
  # Create Tour Favorites Table

  1. New Tables
    - `tour_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References profiles table
      - `tour_id` (text) - Tour identifier (slug or id)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on tour_favorites table
    - Users can view their own favorites
    - Users can insert their own favorites
    - Users can delete their own favorites

  3. Indexes
    - Index on user_id for faster user queries
    - Index on tour_id for lookup
    - Unique constraint on user_id + tour_id to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS tour_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate favorites
ALTER TABLE tour_favorites ADD CONSTRAINT tour_favorites_user_tour_unique UNIQUE (user_id, tour_id);

-- Enable Row Level Security
ALTER TABLE tour_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own tour favorites"
  ON tour_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own tour favorites"
  ON tour_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own tour favorites"
  ON tour_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tour_favorites_user_id ON tour_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_favorites_tour_id ON tour_favorites(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_favorites_created_at ON tour_favorites(created_at DESC);
