-- Migration: Add multi-language columns to webshop_data table
-- This adds English, French, and German translations for Name, Description, and Additional Info
-- Dutch (Name, Description, Additional Info) remains the primary/source content

-- Add English columns
ALTER TABLE webshop_data
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS additional_info_en TEXT;

-- Add French columns
ALTER TABLE webshop_data
ADD COLUMN IF NOT EXISTS name_fr TEXT,
ADD COLUMN IF NOT EXISTS description_fr TEXT,
ADD COLUMN IF NOT EXISTS additional_info_fr TEXT;

-- Add German columns
ALTER TABLE webshop_data
ADD COLUMN IF NOT EXISTS name_de TEXT,
ADD COLUMN IF NOT EXISTS description_de TEXT,
ADD COLUMN IF NOT EXISTS additional_info_de TEXT;

-- Add comments for documentation
COMMENT ON COLUMN webshop_data.name_en IS 'English translation of product name';
COMMENT ON COLUMN webshop_data.description_en IS 'English translation of product description';
COMMENT ON COLUMN webshop_data.additional_info_en IS 'English translation of additional product info';

COMMENT ON COLUMN webshop_data.name_fr IS 'French translation of product name';
COMMENT ON COLUMN webshop_data.description_fr IS 'French translation of product description';
COMMENT ON COLUMN webshop_data.additional_info_fr IS 'French translation of additional product info';

COMMENT ON COLUMN webshop_data.name_de IS 'German translation of product name';
COMMENT ON COLUMN webshop_data.description_de IS 'German translation of product description';
COMMENT ON COLUMN webshop_data.additional_info_de IS 'German translation of additional product info';
