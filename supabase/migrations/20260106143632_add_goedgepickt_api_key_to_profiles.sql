/*
  # Add GoedGepickt API key to profiles table

  1. Changes
    - Add goedgepickt_api_key column to profiles table
    - Store API key for GoedGepickt fulfilment integration
    - Column is nullable (optional integration)

  2. Notes
    - API key is stored as text
    - Only admins can update this field (enforced by application logic)
    - RLS policies on profiles table will apply
*/

-- Add goedgepickt_api_key column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS goedgepickt_api_key text;

-- Add comment for documentation
COMMENT ON COLUMN profiles.goedgepickt_api_key IS 'GoedGepickt fulfilment API key for order fulfilment and inventory management';

