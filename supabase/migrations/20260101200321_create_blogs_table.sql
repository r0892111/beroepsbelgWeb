-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core content (Dutch - primary language)
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL, -- Markdown content
  thumbnail_url text,
  
  -- Optional multi-language content (hidden by default in admin)
  title_en text,
  excerpt_en text,
  content_en text,
  title_fr text,
  excerpt_fr text,
  content_fr text,
  title_de text,
  excerpt_de text,
  content_de text,
  
  -- Metadata
  author text,
  published_at timestamptz,
  status text DEFAULT 'draft', -- 'draft' | 'published'
  featured boolean DEFAULT false,
  category text, -- Optional category/tag
  
  -- Auto-generated SEO fields (filled automatically, editable)
  meta_title text, -- Auto: title + " | Beroepsbelg"
  meta_description text, -- Auto: excerpt or first 160 chars of content
  og_image_url text, -- Auto: thumbnail_url if available
  
  -- Ordering and timestamps
  display_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON blogs(featured);
CREATE INDEX IF NOT EXISTS idx_blogs_display_order ON blogs(display_order);

-- RLS Policies
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blogs"
  ON blogs FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins can manage blogs"
  ON blogs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.isAdmin = true OR profiles.is_admin = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.isAdmin = true OR profiles.is_admin = true)));

-- Comments
COMMENT ON TABLE blogs IS 'Stores blog posts with multi-language support and SEO metadata.';
COMMENT ON COLUMN blogs.slug IS 'URL-friendly identifier, auto-generated from title.';
COMMENT ON COLUMN blogs.status IS 'Publication status: draft or published.';
COMMENT ON COLUMN blogs.meta_title IS 'SEO meta title, auto-generated from title if not provided.';
COMMENT ON COLUMN blogs.meta_description IS 'SEO meta description, auto-generated from excerpt or content if not provided.';
COMMENT ON COLUMN blogs.og_image_url IS 'Open Graph image URL, defaults to thumbnail_url if not provided.';

