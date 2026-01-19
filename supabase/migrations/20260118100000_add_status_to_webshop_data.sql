-- Add status column to webshop_data for draft/published functionality
-- Default to 'draft' for new products

-- Add status column
ALTER TABLE webshop_data
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Create index for performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_webshop_data_status ON webshop_data(status);

-- Update existing products to 'published' (they're already live on the website)
UPDATE webshop_data
SET status = 'published'
WHERE status IS NULL OR status = 'draft';

-- Add comment for documentation
COMMENT ON COLUMN webshop_data.status IS 'Publication status: draft (not visible to public) or published (visible to public)';
