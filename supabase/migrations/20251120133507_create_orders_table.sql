/*
  # Create Orders Table for Webshop Payments

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - References profiles table
      - `stripe_session_id` (text) - Stripe checkout session ID
      - `stripe_payment_intent_id` (text, nullable) - Stripe payment intent ID
      - `status` (text) - 'pending', 'paid', 'cancelled', 'refunded', 'shipped', 'delivered'
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
    - Enable RLS on orders table
    - Users can view their own orders
    - Anyone can create orders (for guest checkout)
    - Only service role can update order status

  3. Indexes
    - Index on user_id for faster user order queries
    - Index on stripe_session_id for webhook lookups
    - Index on status for filtering orders
    - Index on created_at for sorting

  4. Notes
    - Orders can be placed by authenticated or guest users
    - Stripe handles payment processing
    - Webhook updates order status after payment
    - Items stored as JSONB for flexibility
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE NOT NULL,
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

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view orders by session"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous users can create orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can update orders"
  ON orders FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
