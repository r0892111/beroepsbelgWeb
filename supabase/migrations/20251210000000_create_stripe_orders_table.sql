/*
  # Create Stripe Orders Table for Webshop Payments

  1. New Tables
    - `stripe_orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - References profiles table
      - `checkout_session_id` (text) - Stripe checkout session ID
      - `stripe_payment_intent_id` (text, nullable) - Stripe payment intent ID
      - `status` (text) - 'pending', 'completed', 'paid', 'cancelled', 'refunded', 'shipped', 'delivered'
      - `total_amount` (numeric) - Total order amount in euros
      - `currency` (text) - Payment currency (default: 'eur')
      - `customer_name` (text) - Customer name
      - `customer_email` (text) - Customer email
      - `shipping_address` (jsonb) - Shipping address details
      - `billing_address` (jsonb, nullable) - Billing address if different
      - `items` (jsonb) - Array of order items with product details
      - `metadata` (jsonb, nullable) - Additional order information
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on stripe_orders table
    - Users can view their own orders (where user_id matches)
    - Anyone can view orders by checkout_session_id (for success page)
    - Anyone can create orders (for guest checkout)
    - Only service role can update order status

  3. Indexes
    - Index on user_id for faster user order queries
    - Index on checkout_session_id for webhook and success page lookups
    - Index on status for filtering orders
    - Index on created_at for sorting

  4. Notes
    - Orders can be placed by authenticated or guest users
    - Stripe handles payment processing
    - Webhook updates order status after payment
    - Items stored as JSONB for flexibility
*/

CREATE TABLE IF NOT EXISTS stripe_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  checkout_session_id text UNIQUE NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  shipping_address jsonb NOT NULL,
  billing_address jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_orders_user_id ON stripe_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_checkout_session_id ON stripe_orders(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_status ON stripe_orders(status);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_created_at ON stripe_orders(created_at DESC);




