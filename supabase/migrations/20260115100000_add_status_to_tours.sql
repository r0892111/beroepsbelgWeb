-- Add status column to tours_table_prod for draft/published functionality
-- Default to 'draft' for new tours

-- Add status column
ALTER TABLE tours_table_prod
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Create index for performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours_table_prod(status);

-- Update existing tours to 'published' (they're already live on the website)
UPDATE tours_table_prod
SET status = 'published'
WHERE status IS NULL OR status = 'draft';

-- Add comment for documentation
COMMENT ON COLUMN tours_table_prod.status IS 'Publication status: draft (not visible to public) or published (visible to public)';
