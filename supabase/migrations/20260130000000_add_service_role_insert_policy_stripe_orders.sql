-- Allow service role to insert orders (for webhooks)
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Service role can insert orders" ON stripe_orders;

CREATE POLICY "Service role can insert orders"
  ON stripe_orders FOR INSERT
  TO service_role
  WITH CHECK (true);
