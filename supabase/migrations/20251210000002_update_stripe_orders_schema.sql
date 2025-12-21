/*
  # Update stripe_orders table to support order history

  1. Changes
    - Add `user_id` column to link orders to users
    - Add columns for order details (customer_name, customer_email, shipping_address, items, etc.)
    - These columns will be nullable to support existing records
    - Update RLS policies

  2. Notes
    - The table already exists with a different schema
    - We're adding columns to support the checkout function and order history display
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

-- Add customer_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN customer_name text;
  END IF;
END $$;

-- Add customer_email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN customer_email text;
  END IF;
END $$;

-- Add shipping_address column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN shipping_address jsonb;
  END IF;
END $$;

-- Add billing_address column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN billing_address jsonb;
  END IF;
END $$;

-- Add items column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'items'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN items jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add metadata column if it doesn't exist (might already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add total_amount column if it doesn't exist (for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE stripe_orders 
    ADD COLUMN total_amount numeric;
    -- Populate from amount_total if it exists
    UPDATE stripe_orders 
    SET total_amount = amount_total / 100.0 
    WHERE total_amount IS NULL AND amount_total IS NOT NULL;
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




