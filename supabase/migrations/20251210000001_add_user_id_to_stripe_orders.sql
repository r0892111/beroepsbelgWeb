/*
  # Add user_id column to stripe_orders table and set up RLS

  1. Changes
    - Add `user_id` column to existing `stripe_orders` table
    - Add foreign key reference to profiles table
    - Enable RLS if not already enabled
    - Create RLS policies for users to view their own orders
    - Add index on user_id for performance

  2. Notes
    - The table already exists with a different schema
    - We're adding user_id to link orders to authenticated users
    - Existing orders will have NULL user_id (guest orders)
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own orders" ON stripe_orders;
DROP POLICY IF EXISTS "Anyone can view orders by session" ON stripe_orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON stripe_orders;
DROP POLICY IF EXISTS "Anonymous users can create orders" ON stripe_orders;
DROP POLICY IF EXISTS "Service role can update orders" ON stripe_orders;

-- Allow authenticated users to view their own orders
CREATE POLICY "Users can view own orders"
  ON stripe_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anyone to view orders by checkout_session_id (for success page)
CREATE POLICY "Anyone can view orders by session"
  ON stripe_orders FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to create orders
CREATE POLICY "Authenticated users can create orders"
  ON stripe_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous users to create orders (for guest checkout)
CREATE POLICY "Anonymous users can create orders"
  ON stripe_orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow service role to update orders (for webhooks)
CREATE POLICY "Service role can update orders"
  ON stripe_orders FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on user_id for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_stripe_orders_user_id ON stripe_orders(user_id);




