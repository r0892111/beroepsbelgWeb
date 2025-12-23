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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    const { type, table, record, old_record } = payload;

    if (table !== 'tours_table_prod') {
      throw new Error(`Invalid table: ${table}`);
    }

    // Handle INSERT - Create new Stripe product
    if (type === 'INSERT') {
      console.log('Creating Stripe product for new tour:', record.id);

      // Create Stripe product
      const product = await stripe.products.create({
        name: record.title,
        description: record.description || undefined,
        metadata: {
          tour_id: record.id,
          city: record.city,
          type: record.type,
          duration_minutes: record.duration_minutes.toString(),
          start_location: record.start_location || '',
          end_location: record.end_location || '',
        },
        active: true,
      });

      console.log('Stripe product created:', product.id);

      // Create Stripe price if price is provided
      let priceId = null;
      if (record.price && record.price > 0) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(record.price * 100), // Convert to cents
          currency: 'eur',
          metadata: {
            tour_id: record.id,
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

      // Update tour record with Stripe IDs
      const tourOptions = record.options || {};
      const { error: updateError } = await supabase
        .from('tours_table_prod')
        .update({
          options: {
            ...tourOptions,
            stripe_product_id: product.id,
            stripe_price_id: priceId,
          },
        })
        .eq('id', record.id);

      if (updateError) {
        console.error('Failed to update tour with Stripe IDs:', updateError);
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
      console.log('Updating Stripe product for tour:', record.id);

      const oldOptions = old_record?.options || {};
      const stripeProductId = oldOptions.stripe_product_id;

      if (!stripeProductId) {
        console.log('No Stripe product ID found, creating new product');
        
        // If no Stripe product exists, create one
        const product = await stripe.products.create({
          name: record.title,
          description: record.description || undefined,
          metadata: {
            tour_id: record.id,
            city: record.city,
            type: record.type,
            duration_minutes: record.duration_minutes.toString(),
            start_location: record.start_location || '',
            end_location: record.end_location || '',
          },
          active: true,
        });

        let priceId = null;
        if (record.price && record.price > 0) {
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(record.price * 100),
            currency: 'eur',
            metadata: {
              tour_id: record.id,
            },
          });
          priceId = price.id;

          // Set as default price
          await stripe.products.update(product.id, {
            default_price: priceId,
          });
          console.log('Set price as default for product:', product.id);
        }

        const tourOptions = record.options || {};
        await supabase
          .from('tours_table_prod')
          .update({
            options: {
              ...tourOptions,
              stripe_product_id: product.id,
              stripe_price_id: priceId,
            },
          })
          .eq('id', record.id);

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
      await stripe.products.update(stripeProductId, {
        name: record.title,
        description: record.description || undefined,
        metadata: {
          tour_id: record.id,
          city: record.city,
          type: record.type,
          duration_minutes: record.duration_minutes.toString(),
          start_location: record.start_location || '',
          end_location: record.end_location || '',
        },
      });

      console.log('Stripe product updated:', stripeProductId);

      // Check if price changed
      const oldPrice = old_record?.price;
      const newPrice = record.price;
      let newPriceId = oldOptions.stripe_price_id;

      if (oldPrice !== newPrice && newPrice && newPrice > 0) {
        console.log('Price changed, creating new Stripe price');
        
        // Archive old price if exists
        if (oldOptions.stripe_price_id) {
          try {
            await stripe.prices.update(oldOptions.stripe_price_id, {
              active: false,
            });
            console.log('Old price archived:', oldOptions.stripe_price_id);
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
            tour_id: record.id,
          },
        });

        newPriceId = price.id;
        console.log('New Stripe price created:', newPriceId);

        // Set new price as default
        await stripe.products.update(stripeProductId, {
          default_price: newPriceId,
        });
        console.log('Set new price as default for product:', stripeProductId);

        // Update tour with new price ID
        const tourOptions = record.options || {};
        await supabase
          .from('tours_table_prod')
          .update({
            options: {
              ...tourOptions,
              stripe_product_id: stripeProductId,
              stripe_price_id: newPriceId,
            },
          })
          .eq('id', record.id);
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
    console.error('Sync tour to Stripe error:', error);
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

