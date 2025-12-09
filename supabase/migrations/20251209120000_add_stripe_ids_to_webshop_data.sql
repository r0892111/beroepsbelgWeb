/*
  # Add Stripe IDs to webshop_data table

  1. Changes
    - Add stripe_product_id column to store Stripe product ID
    - Add stripe_price_id column to store Stripe price ID
    - Add indexes for faster lookups

  2. Notes
    - These columns will be populated by the sync-webshop-to-stripe edge function
    - Products can be synced to Stripe automatically when created/updated
*/

-- Add Stripe ID columns
ALTER TABLE webshop_data 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_webshop_data_stripe_product_id ON webshop_data(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_webshop_data_stripe_price_id ON webshop_data(stripe_price_id);

-- Add comments for documentation
COMMENT ON COLUMN webshop_data.stripe_product_id IS 'Stripe product ID - populated automatically by sync-webshop-to-stripe function';
COMMENT ON COLUMN webshop_data.stripe_price_id IS 'Stripe price ID - populated automatically by sync-webshop-to-stripe function';

