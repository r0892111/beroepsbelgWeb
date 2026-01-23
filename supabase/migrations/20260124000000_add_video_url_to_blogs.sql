-- Add video_url column to blogs table for video thumbnail support
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS video_url text;

-- Add comment
COMMENT ON COLUMN blogs.video_url IS 'Video URL for blog post thumbnail. Supports video formats (mp4, webm, mov).';
