import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import Stripe from 'npm:stripe@14.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    const { type, table, record, old_record } = payload;

    if (table !== 'webshop_data') {
      throw new Error(`Invalid table: ${table}`);
    }

    // Handle INSERT - Create new Stripe product
    if (type === 'INSERT') {
      console.log('Creating Stripe product for new webshop item:', record.uuid);

      const productName = record.Name || 'Unnamed Product';
      const productDescription = record.Description || undefined;
      const priceValue = parseFloat(record['Price (EUR)']?.toString().replace(',', '.') || '0');

      // Create Stripe product
      const product = await stripe.products.create({
        name: productName,
        description: productDescription,
        metadata: {
          webshop_uuid: record.uuid,
          category: record.Category || '',
        },
        active: true,
      });

      console.log('Stripe product created:', product.id);

      // Create Stripe price if price is provided
      let priceId = null;
      if (priceValue > 0) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(priceValue * 100), // Convert to cents
          currency: 'eur',
          metadata: {
            webshop_uuid: record.uuid,
          },
        });

        priceId = price.id;
        console.log('Stripe price created:', priceId);

        // Set this price as the default price for the product
        await stripe.products.update(product.id, {
          default_price: priceId,
        });
        console.log('Set price as default for product:', product.id);
      }

      // Update webshop_data record with Stripe IDs
      const { error: updateError } = await supabase
        .from('webshop_data')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: priceId,
        })
        .eq('uuid', record.uuid);

      if (updateError) {
        console.error('Failed to update webshop_data with Stripe IDs:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          product_id: product.id,
          price_id: priceId,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle UPDATE - Update Stripe product/price
    if (type === 'UPDATE') {
      console.log('Updating Stripe product for webshop item:', record.uuid);

      const stripeProductId = old_record?.stripe_product_id || record.stripe_product_id;

      if (!stripeProductId) {
        console.log('No Stripe product ID found, creating new product');
        
        // If no Stripe product exists, create one
        const productName = record.Name || 'Unnamed Product';
        const productDescription = record.Description || undefined;
        const priceValue = parseFloat(record['Price (EUR)']?.toString().replace(',', '.') || '0');

        const product = await stripe.products.create({
          name: productName,
          description: productDescription,
          metadata: {
            webshop_uuid: record.uuid,
            category: record.Category || '',
          },
          active: true,
        });

        let priceId = null;
        if (priceValue > 0) {
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(priceValue * 100),
            currency: 'eur',
            metadata: {
              webshop_uuid: record.uuid,
            },
          });
          priceId = price.id;

          // Set as default price
          await stripe.products.update(product.id, {
            default_price: priceId,
          });
          console.log('Set price as default for product:', product.id);
        }

        await supabase
          .from('webshop_data')
          .update({
            stripe_product_id: product.id,
            stripe_price_id: priceId,
          })
          .eq('uuid', record.uuid);

        return new Response(
          JSON.stringify({
            success: true,
            product_id: product.id,
            price_id: priceId,
            action: 'created',
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Update existing Stripe product
      const productName = record.Name || 'Unnamed Product';
      const productDescription = record.Description || undefined;

      await stripe.products.update(stripeProductId, {
        name: productName,
        description: productDescription,
        metadata: {
          webshop_uuid: record.uuid,
          category: record.Category || '',
        },
      });

      console.log('Stripe product updated:', stripeProductId);

      // Check if price changed
      const oldPriceStr = old_record?.['Price (EUR)']?.toString() || '0';
      const newPriceStr = record['Price (EUR)']?.toString() || '0';
      const oldPrice = parseFloat(oldPriceStr.replace(',', '.'));
      const newPrice = parseFloat(newPriceStr.replace(',', '.'));
      let newPriceId = old_record?.stripe_price_id || record.stripe_price_id;

      if (oldPrice !== newPrice && newPrice > 0) {
        console.log('Price changed, creating new Stripe price');
        
        // Archive old price if exists
        if (old_record?.stripe_price_id) {
          try {
            await stripe.prices.update(old_record.stripe_price_id, {
              active: false,
            });
            console.log('Old price archived:', old_record.stripe_price_id);
          } catch (err) {
            console.error('Failed to archive old price:', err);
          }
        }

        // Create new price
        const price = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: Math.round(newPrice * 100),
          currency: 'eur',
          metadata: {
            webshop_uuid: record.uuid,
          },
        });

        newPriceId = price.id;
        console.log('New Stripe price created:', newPriceId);

        // Set new price as default
        await stripe.products.update(stripeProductId, {
          default_price: newPriceId,
        });
        console.log('Set new price as default for product:', stripeProductId);

        // Update webshop_data with new price ID
        await supabase
          .from('webshop_data')
          .update({
            stripe_product_id: stripeProductId,
            stripe_price_id: newPriceId,
          })
          .eq('uuid', record.uuid);
      }

      return new Response(
        JSON.stringify({
          success: true,
          product_id: stripeProductId,
          price_id: newPriceId,
          action: 'updated',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error(`Unsupported webhook type: ${type}`);
  } catch (error) {
    console.error('Sync webshop to Stripe error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

