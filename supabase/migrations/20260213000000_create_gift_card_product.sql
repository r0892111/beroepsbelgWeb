-- Create Gift Card product in webshop_data
-- This product allows customers to purchase gift cards with custom amounts
-- Gift cards are delivered via email and can be used for tours or webshop products

-- Ensure is_giftcard column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'webshop_data' 
    AND column_name = 'is_giftcard') THEN
    ALTER TABLE public.webshop_data ADD COLUMN is_giftcard boolean DEFAULT false;
  END IF;
END $$;

-- Ensure status column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'webshop_data' 
    AND column_name = 'status') THEN
    ALTER TABLE public.webshop_data ADD COLUMN status TEXT DEFAULT 'published';
  END IF;
END $$;

-- Insert or update the gift card product
INSERT INTO public.webshop_data (
  uuid,
  "Name",
  "Description",
  "Price (EUR)",
  "Category",
  "Additional Info",
  status,
  display_order,
  category_display_order,
  product_images,
  is_giftcard,
  -- Multilingual fields
  name_en,
  description_en,
  additional_info_en,
  name_fr,
  description_fr,
  additional_info_fr,
  name_de,
  description_de,
  additional_info_de
) VALUES (
  gen_random_uuid(),
  'Cadeaubon',
  'Geef het cadeau van een unieke stadswandeling! Deze digitale cadeaubon kan worden gebruikt voor elke tour of product in onze webshop. Kies zelf het bedrag.',
  0, -- Price is set dynamically by customer (€25 - €10,000)
  'GiftCard',
  'Digitale cadeaubon - direct per e-mail geleverd. Geen verzendkosten. Geldig voor alle tours en producten.',
  'published',
  999, -- Display at end
  1, -- First in GiftCard category
  '[]'::jsonb,
  true,
  -- English translations
  'Gift Card',
  'Give the gift of a unique city walk! This digital gift card can be used for any tour or product in our webshop. Choose your own amount.',
  'Digital gift card - delivered instantly via email. No shipping costs. Valid for all tours and products.',
  -- French translations
  'Carte Cadeau',
  'Offrez le cadeau d''une promenade urbaine unique ! Cette carte cadeau numérique peut être utilisée pour n''importe quelle visite ou produit dans notre boutique en ligne. Choisissez votre propre montant.',
  'Carte cadeau numérique - livrée instantanément par e-mail. Aucun frais d''expédition. Valable pour toutes les visites et produits.',
  -- German translations
  'Geschenkkarte',
  'Schenken Sie das Geschenk eines einzigartigen Stadtrundgangs! Diese digitale Geschenkkarte kann für jede Tour oder jedes Produkt in unserem Webshop verwendet werden. Wählen Sie Ihren eigenen Betrag.',
  'Digitale Geschenkkarte - sofort per E-Mail geliefert. Keine Versandkosten. Gültig für alle Touren und Produkte.'
) ON CONFLICT (uuid) DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "Category" = EXCLUDED."Category",
  "Additional Info" = EXCLUDED."Additional Info",
  status = EXCLUDED.status,
  is_giftcard = EXCLUDED.is_giftcard,
  name_en = EXCLUDED.name_en,
  description_en = EXCLUDED.description_en,
  additional_info_en = EXCLUDED.additional_info_en,
  name_fr = EXCLUDED.name_fr,
  description_fr = EXCLUDED.description_fr,
  additional_info_fr = EXCLUDED.additional_info_fr,
  name_de = EXCLUDED.name_de,
  description_de = EXCLUDED.description_de,
  additional_info_de = EXCLUDED.additional_info_de;

-- Also update any existing gift card products to ensure they have the correct settings
UPDATE public.webshop_data 
SET 
  is_giftcard = true,
  "Category" = 'GiftCard',
  status = 'published'
WHERE "Category" = 'GiftCard' OR is_giftcard = true;
