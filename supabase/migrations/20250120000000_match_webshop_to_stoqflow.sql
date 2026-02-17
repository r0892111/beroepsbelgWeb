-- Migration: Match webshop products to Stoqflow products
-- Generated: 2026-02-17T21:27:48.226Z
-- Matched: 20 products
-- Unmatched: 1 products

-- Add stoqflow_id column if it doesn't exist
ALTER TABLE webshop_data ADD COLUMN IF NOT EXISTS stoqflow_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webshop_data_stoqflow_id ON webshop_data(stoqflow_id);

-- Add comment for documentation
COMMENT ON COLUMN webshop_data.stoqflow_id IS 'Stoqflow product ID - populated by matching function or sync process';

-- Update matched products
UPDATE webshop_data SET stoqflow_id = 'ErjEJmzEq8o5ioXjW' WHERE uuid = 'a92bd21e-6535-4007-8ab3-9a5a8e12cfa6'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'iTk76dD9bbgYf8uxk' WHERE uuid = 'e58b7d59-6141-4dca-9b8d-95ad242a30e1'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'zb4w4QZXsdQnot2ex' WHERE uuid = '00e77558-78fe-41db-bd68-cdbc26f3de17'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'mvmyvWtvAGjx4vzvA' WHERE uuid = 'e8b92e4e-051b-4848-916f-14a3479fd4b2'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'fcE9JWBtTPbeRPdu3' WHERE uuid = '17689fb6-ecfe-4f3a-b52e-083a93ac6b86'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'paqg7KDWYpxKSCuwM' WHERE uuid = '37124cd2-128c-4c1e-b7d3-5bb0c2a8ebcb'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'NZ3bCdEoZFLqpafiK' WHERE uuid = '87bb73b6-bcb2-430f-a16d-8d4b00c45779'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'SdEBFroLhfbCqSdmD' WHERE uuid = '06f563b8-6fbd-4431-8054-32972ef59e40'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'AyvvHdtxpL7KsEzwo' WHERE uuid = 'ccfe1afb-3bb0-4fb6-93f2-4472d4354af8'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'FFCe5QbAwzRq6h6m2' WHERE uuid = 'b4ba4a8a-5b34-4535-8700-5bdc448ee9f7'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'T3zR8uExoCZCpFPKw' WHERE uuid = '8aae10e6-3694-4800-8258-0429709e53b6'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'KwPj9cRosZoSpMDoc' WHERE uuid = '84c7c7e3-e744-44f6-80df-b05c94e76fed'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = '5hhxLZjgGonRMmFeG' WHERE uuid = '354b683f-cfe8-4699-9faa-924282b4341a'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'GEa6uF6rMzmo24Bac' WHERE uuid = 'b0767a90-4395-4bb6-a09d-51139461cf5d'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = '3i4gMP9yKshnqX5Kr' WHERE uuid = 'e921c2e9-d991-4827-8560-e3c342fff9bb'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'aDPwzGoLXvoLdAkem' WHERE uuid = '7dbaf3da-16cb-43e1-b005-c77ed42a14d4'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'd6r75GgErtCf2WFHM' WHERE uuid = 'b25daa24-ac4f-4c84-8650-a572c6405768'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'LznGQJbZnTLsNq9np' WHERE uuid = '80d86651-ff35-45d2-be0e-750e3054b602'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = '5ZaN7F7w8ce98dim8' WHERE uuid = '22d33401-6b30-4ebb-814b-843ef47a9b23'; -- name_fuzzy
UPDATE webshop_data SET stoqflow_id = 'S3c9tYsReCCo2KBHG' WHERE uuid = '139893ba-5942-4486-b4f4-3d03778cc2d8'; -- name_fuzzy

-- Note: Unmatched products (1):
--   - Cadeaubon (UUID: 1d23952d-f91d-4b8c-8db7-466f3642d687, Generated SKU: 1d23952df91d4b8c8db7466f3642d687)
--   This product may not exist in Stoqflow yet, or may have a different name.
