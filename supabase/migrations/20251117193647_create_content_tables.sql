/*
  # Create Content Management Tables

  1. New Tables
    - `cities`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly identifier
      - `name_nl`, `name_en`, `name_fr`, `name_de` (text) - City names in different languages
      - `teaser_nl`, `teaser_en`, `teaser_fr`, `teaser_de` (text) - Teasers in different languages
      - `cta_text_nl`, `cta_text_en`, `cta_text_fr`, `cta_text_de` (text, nullable) - CTA button text
      - `image` (text, nullable) - Image URL
      - `status` (text) - 'live' or 'coming-soon'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `tours`
      - `id` (uuid, primary key)
      - `city_slug` (text) - References city
      - `slug` (text) - URL-friendly identifier
      - `title_nl`, `title_en`, `title_fr`, `title_de` (text) - Tour titles
      - `price` (numeric, nullable) - Tour price
      - `badge` (text, nullable) - 'EXCLUSIEF', 'UITVERKOCHT', 'NIEUW'
      - `short_description_nl`, `short_description_en`, `short_description_fr`, `short_description_de` (text)
      - `description_nl`, `description_en`, `description_fr`, `description_de` (text, nullable)
      - `thumbnail` (text, nullable) - Main image URL
      - `images` (jsonb, nullable) - Array of image URLs
      - `details` (jsonb, nullable) - Tour details object
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `products`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly identifier
      - `uuid_legacy` (text) - Original UUID from static data
      - `title_nl`, `title_en`, `title_fr`, `title_de` (text) - Product titles
      - `category` (text) - 'Book', 'Merchandise', 'Game'
      - `price` (numeric) - Product price
      - `description_nl`, `description_en`, `description_fr`, `description_de` (text)
      - `additional_info_nl`, `additional_info_en`, `additional_info_fr`, `additional_info_de` (text, nullable)
      - `label` (text, nullable) - Special label like '2e DRUK'
      - `image` (text, nullable) - Product image URL
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `blog_posts`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly identifier
      - `title_nl`, `title_en`, `title_fr`, `title_de` (text) - Post titles
      - `excerpt_nl`, `excerpt_en`, `excerpt_fr`, `excerpt_de` (text) - Post excerpts
      - `date` (date) - Publication date
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `press_links`
      - `id` (uuid, primary key)
      - `name` (text) - Press outlet name
      - `url` (text) - Link URL
      - `logo` (text, nullable) - Logo URL
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `faq_items`
      - `id` (uuid, primary key)
      - `question_nl`, `question_en`, `question_fr`, `question_de` (text) - Questions
      - `answer_nl`, `answer_en`, `answer_fr`, `answer_de` (text) - Answers
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on all tables
    - Allow public read access (SELECT) for all content tables
    - Restrict write access to authenticated users only
    
  3. Notes
    - All content is public-readable since it's displayed on the public website
    - Admin users will manage content (future feature)
    - Separate language columns for better query performance vs JSONB
*/

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_nl text NOT NULL,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  name_de text NOT NULL,
  teaser_nl text NOT NULL,
  teaser_en text NOT NULL,
  teaser_fr text NOT NULL,
  teaser_de text NOT NULL,
  cta_text_nl text,
  cta_text_en text,
  cta_text_fr text,
  cta_text_de text,
  image text,
  status text NOT NULL DEFAULT 'live',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are publicly readable"
  ON cities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cities"
  ON cities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cities"
  ON cities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete cities"
  ON cities FOR DELETE
  TO authenticated
  USING (true);

-- Tours table
CREATE TABLE IF NOT EXISTS tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  slug text NOT NULL,
  title_nl text NOT NULL,
  title_en text NOT NULL,
  title_fr text NOT NULL,
  title_de text NOT NULL,
  price numeric,
  badge text,
  short_description_nl text NOT NULL,
  short_description_en text NOT NULL,
  short_description_fr text NOT NULL,
  short_description_de text NOT NULL,
  description_nl text,
  description_en text,
  description_fr text,
  description_de text,
  thumbnail text,
  images jsonb DEFAULT '[]'::jsonb,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city_slug, slug)
);

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tours are publicly readable"
  ON tours FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tours"
  ON tours FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tours"
  ON tours FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tours"
  ON tours FOR DELETE
  TO authenticated
  USING (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  uuid_legacy text NOT NULL,
  title_nl text NOT NULL,
  title_en text NOT NULL,
  title_fr text NOT NULL,
  title_de text NOT NULL,
  category text NOT NULL,
  price numeric NOT NULL,
  description_nl text NOT NULL,
  description_en text NOT NULL,
  description_fr text NOT NULL,
  description_de text NOT NULL,
  additional_info_nl text,
  additional_info_en text,
  additional_info_fr text,
  additional_info_de text,
  label text,
  image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_nl text NOT NULL,
  title_en text NOT NULL,
  title_fr text NOT NULL,
  title_de text NOT NULL,
  excerpt_nl text NOT NULL,
  excerpt_en text NOT NULL,
  excerpt_fr text NOT NULL,
  excerpt_de text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog posts are publicly readable"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (true);

-- Press links table
CREATE TABLE IF NOT EXISTS press_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  logo text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE press_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Press links are publicly readable"
  ON press_links FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert press links"
  ON press_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update press links"
  ON press_links FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete press links"
  ON press_links FOR DELETE
  TO authenticated
  USING (true);

-- FAQ items table
CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_nl text NOT NULL,
  question_en text NOT NULL,
  question_fr text NOT NULL,
  question_de text NOT NULL,
  answer_nl text NOT NULL,
  answer_en text NOT NULL,
  answer_fr text NOT NULL,
  answer_de text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQ items are publicly readable"
  ON faq_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert FAQ items"
  ON faq_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update FAQ items"
  ON faq_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete FAQ items"
  ON faq_items FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_status ON cities(status);
CREATE INDEX IF NOT EXISTS idx_tours_city_slug ON tours(city_slug);
CREATE INDEX IF NOT EXISTS idx_tours_slug ON tours(slug);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON blog_posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_press_links_sort_order ON press_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_items_sort_order ON faq_items(sort_order);