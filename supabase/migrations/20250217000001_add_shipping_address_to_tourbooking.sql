/*
  # Add Shipping Address to tourbooking
  
  1. Changes
    - Add shipping address columns to `tourbooking` table
    - Store shipping address for upsell product fulfillment
    - Columns: shipping_full_name, shipping_street, shipping_city, shipping_postal_code, shipping_country
*/

-- Add shipping address columns if they don't exist
DO $$
BEGIN
  -- shipping_full_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'shipping_full_name'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN shipping_full_name text;
  END IF;

  -- shipping_street
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'shipping_street'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN shipping_street text;
  END IF;

  -- shipping_city
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'shipping_city'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN shipping_city text;
  END IF;

  -- shipping_postal_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'shipping_postal_code'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN shipping_postal_code text;
  END IF;

  -- shipping_country
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tourbooking' AND column_name = 'shipping_country'
  ) THEN
    ALTER TABLE tourbooking ADD COLUMN shipping_country text DEFAULT 'BE';
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tourbooking_shipping_postal_code 
ON tourbooking(shipping_postal_code);
