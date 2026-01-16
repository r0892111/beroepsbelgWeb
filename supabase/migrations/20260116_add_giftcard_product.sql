-- Add Gift Card product to webshop_data
-- This product has a special category 'GiftCard' that triggers custom amount selection
-- No shipping fees apply to gift cards

INSERT INTO public.webshop_data (
  uuid,
  "Name",
  "Description",
  "Price (EUR)",
  "Category",
  "Additional Info",
  stripe_product_id,
  display_order,
  product_images,
  is_giftcard
) VALUES (
  gen_random_uuid(),
  'Cadeaubon',
  'Geef het cadeau van een unieke stadswandeling! Deze digitale cadeaubon kan worden gebruikt voor elke tour of product in onze webshop. Kies zelf het bedrag.',
  0, -- Price is set dynamically by customer
  'GiftCard',
  'Digitale cadeaubon - direct per e-mail geleverd. Geen verzendkosten.',
  'prod_TnrjY3dpMoUw4G',
  999, -- Display at end or customize
  '[]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Add is_giftcard column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'webshop_data' 
    AND column_name = 'is_giftcard') THEN
    ALTER TABLE public.webshop_data ADD COLUMN is_giftcard boolean DEFAULT false;
  END IF;
END $$;

-- Update the gift card product to have is_giftcard = true (in case it already exists)
UPDATE public.webshop_data 
SET is_giftcard = true 
WHERE stripe_product_id = 'prod_TnrjY3dpMoUw4G';
