/*
  Add stripe_payment_intent_id column to stripe_orders table if it doesn't exist.
  This column stores the Stripe payment intent ID for tracking payments.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE stripe_orders
    ADD COLUMN stripe_payment_intent_id text;
  END IF;
END $$;

-- Create index for faster lookups by payment intent ID
CREATE INDEX IF NOT EXISTS idx_stripe_orders_payment_intent_id ON stripe_orders(stripe_payment_intent_id);
