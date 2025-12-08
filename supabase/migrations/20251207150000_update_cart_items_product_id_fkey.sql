/*
  # Update cart_items to reference webshop_data

  1. Changes
    - Change product_id from text to uuid to match webshop_data.uuid
    - Add foreign key constraint to webshop_data.uuid
    - Update existing data if needed (this assumes product_id values are already UUIDs)

  2. Notes
    - If product_id contains non-UUID values, they will need to be migrated first
    - The foreign key ensures referential integrity
*/

-- First, check if product_id can be converted to uuid
-- If there are non-UUID values, this will fail and need manual migration

-- Step 1: Check if there are any invalid UUIDs in product_id
-- If there are, you'll need to clean them up first
DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM cart_items
  WHERE product_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % cart items with invalid UUID format in product_id. Please clean up first.', invalid_count;
  END IF;
END $$;

-- Step 2: Add a temporary column with uuid type
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS product_id_uuid uuid;

-- Step 3: Convert existing product_id values to uuid
UPDATE cart_items 
SET product_id_uuid = product_id::uuid 
WHERE product_id_uuid IS NULL;

-- Step 4: Drop the unique constraint first (it references product_id)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Step 5: Drop the old product_id column
ALTER TABLE cart_items DROP COLUMN IF EXISTS product_id;

-- Step 6: Rename the new column to product_id
ALTER TABLE cart_items RENAME COLUMN product_id_uuid TO product_id;

-- Step 7: Make product_id NOT NULL
ALTER TABLE cart_items ALTER COLUMN product_id SET NOT NULL;

-- Step 6: Add foreign key constraint to webshop_data
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES webshop_data(uuid) 
ON DELETE CASCADE;

-- Step 7: Recreate the unique constraint with the new column type
-- Drop existing constraint if it exists
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Add the constraint back
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_user_id_product_id_key 
UNIQUE (user_id, product_id);

-- Step 8: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

