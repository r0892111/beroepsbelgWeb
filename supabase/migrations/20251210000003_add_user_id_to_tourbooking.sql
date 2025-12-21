/*
  # Add user_id column to tourbooking table

  1. Changes
    - Add `user_id` column to `tourbooking` table if it doesn't exist
    - Add foreign key reference to profiles table
    - Create index on user_id for performance
    - Update RLS policies to allow users to view their own bookings

  2. Notes
    - This allows logged-in users to see their bookings in the account page
    - Existing bookings will have NULL user_id (guest bookings)
    - New bookings from logged-in users will have user_id set
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tourbooking 
    ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on user_id for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_tourbooking_user_id ON tourbooking(user_id);

-- Enable RLS if not already enabled
ALTER TABLE tourbooking ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can view own bookings" ON tourbooking;

-- Allow authenticated users to view their own bookings
CREATE POLICY "Users can view own bookings"
  ON tourbooking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Keep the existing policy for viewing by session (for success page)
-- This is already created in 20251130160000_add_rls_policies_to_tourbooking.sql




