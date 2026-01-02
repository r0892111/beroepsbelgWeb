-- Create blog_images table for inline images in blog content
CREATE TABLE IF NOT EXISTS blog_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid REFERENCES blogs(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  alt_text text,
  width_percentage integer DEFAULT 100, -- 25, 50, 75, 100 or custom
  position_in_content integer, -- Order within the blog content
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_images_blog_id ON blog_images(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_images_position ON blog_images(blog_id, position_in_content);

-- RLS Policies
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog images"
  ON blog_images FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM blogs WHERE blogs.id = blog_images.blog_id AND blogs.status = 'published'));

CREATE POLICY "Admins can manage blog images"
  ON blog_images FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.isAdmin = true OR profiles.is_admin = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.isAdmin = true OR profiles.is_admin = true)));

-- Comments
COMMENT ON TABLE blog_images IS 'Stores inline images for blog posts with sizing and positioning information.';
COMMENT ON COLUMN blog_images.width_percentage IS 'Display width percentage: 25, 50, 75, 100, or custom value.';
COMMENT ON COLUMN blog_images.position_in_content IS 'Order/position of image within the blog content.';

