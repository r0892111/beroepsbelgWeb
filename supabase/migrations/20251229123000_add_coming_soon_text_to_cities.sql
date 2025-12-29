/*
  # Add coming_soon_text columns to cities table

  1. Changes
    - Add coming_soon_text_nl, coming_soon_text_en, coming_soon_text_fr, coming_soon_text_de columns
    - These allow admins to customize the text shown on "coming soon" city buttons
    - All columns are nullable (optional)

  2. Notes
    - If not set, the default translation will be used
    - Allows per-locale customization of the coming soon button text
*/

-- Add coming_soon_text columns to cities table
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS coming_soon_text_nl text,
ADD COLUMN IF NOT EXISTS coming_soon_text_en text,
ADD COLUMN IF NOT EXISTS coming_soon_text_fr text,
ADD COLUMN IF NOT EXISTS coming_soon_text_de text;

-- Add comments for documentation
COMMENT ON COLUMN cities.coming_soon_text_nl IS 'Custom text for "coming soon" button in Dutch. If null, default translation is used.';
COMMENT ON COLUMN cities.coming_soon_text_en IS 'Custom text for "coming soon" button in English. If null, default translation is used.';
COMMENT ON COLUMN cities.coming_soon_text_fr IS 'Custom text for "coming soon" button in French. If null, default translation is used.';
COMMENT ON COLUMN cities.coming_soon_text_de IS 'Custom text for "coming soon" button in German. If null, default translation is used.';

