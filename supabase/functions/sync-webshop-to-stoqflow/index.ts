import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stoqflowClientId = Deno.env.get('STOQFLOW_CLIENT_ID');
const stoqflowClientSecret = Deno.env.get('STOQFLOW_CLIENT_SECRET');
const stoqflowShopId = Deno.env.get('STOQFLOW_SHOP_ID');
const stoqflowBrandId = Deno.env.get('STOQFLOW_BRAND_ID');
const stoqflowBaseUrl = Deno.env.get('STOQFLOW_BASE_URL');
// Rate limiting: delay between API requests (ms)
// Rate limiting: delay between API requests (ms)
// Increased default to 3000ms (3 seconds) to avoid rate limits
const rateLimitDelayMs = parseInt(Deno.env.get('STOQFLOW_RATE_LIMIT_DELAY_MS') || '3000', 10);

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check if Stoqflow credentials are configured
    if (!stoqflowClientId || !stoqflowClientSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Stoqflow credentials not configured',
          message: 'Please set STOQFLOW_CLIENT_ID and STOQFLOW_CLIENT_SECRET environment variables'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if Stoqflow base URL is configured
    if (!stoqflowBaseUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Stoqflow base URL not configured',
          message: 'Please set STOQFLOW_BASE_URL environment variable to your Stoqflow server URL (e.g., https://dundermifflin.stoqflow.com)',
          hint: 'The base URL should be your Stoqflow server URL, not your website URL'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand_id from Stoqflow API using /company endpoint
    console.info('[Sync] ========================================');
    console.info('[Sync] Step 1: Fetching company structure from Stoqflow API');
    console.info('[Sync] ========================================');
    
    const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
    const basicAuth = btoa(credentials);
    
    let fetchedBrandId: string | null = null;
    let companyResponseData: any = null;
    let apiError: { message: string; details?: any } | null = null;
    
    try {
      const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;
      const companyEndpoint = `${apiBaseUrl}/company`;
      
      const companyRes = await fetch(companyEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
      });

      const responseText = await companyRes.text();

      if (companyRes.ok) {
        try {
          companyResponseData = JSON.parse(responseText);
          
          if (companyResponseData.brands && Array.isArray(companyResponseData.brands) && companyResponseData.brands.length > 0) {
            let selectedBrand = companyResponseData.brands[0];
            
            if (stoqflowShopId) {
              for (const brand of companyResponseData.brands) {
                if (brand.shops && Array.isArray(brand.shops)) {
                  const matchingShop = brand.shops.find((s: any) => s._id === stoqflowShopId || s.id === stoqflowShopId);
                  if (matchingShop) {
                    selectedBrand = brand;
                    break;
                  }
                }
              }
            }
            
            fetchedBrandId = selectedBrand._id || selectedBrand.id || null;
            console.info('[Sync] ✅ Brand selected:', fetchedBrandId);
          }
        } catch (parseError: any) {
          console.error('[Sync] ❌ Failed to parse company response:', parseError.message);
        }
      } else {
        const isHtmlResponse = responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html');
        if (companyRes.status === 404 && isHtmlResponse) {
          apiError = {
            message: 'STOQFLOW_BASE_URL is pointing to the wrong server',
            details: {
              current_url: stoqflowBaseUrl,
              expected_format: 'https://yourcompany.stoqflow.com',
            }
          };
        }
      }
    } catch (err: any) {
      console.error('[Sync] ❌ Exception while fetching company structure:', err.message);
    }

    const brandIdToUse = fetchedBrandId || stoqflowBrandId;
    
    if (!brandIdToUse) {
      return new Response(
        JSON.stringify({ 
          error: 'Brand ID not available',
          message: 'Could not fetch brand_id from Stoqflow API and STOQFLOW_BRAND_ID is not set.',
          api_error: apiError,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info('[Sync] ========================================');
    console.info('[Sync] Step 2: Fetching webshop products from database');
    console.info('[Sync] ========================================');

    // Fetch webshop products from database
    let requestBody: any = null;
    try {
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const bodyText = await req.text();
        if (bodyText && bodyText.trim()) {
          requestBody = JSON.parse(bodyText);
        }
      }
    } catch (err: any) {
      console.warn('[Sync] Failed to parse request body:', err.message);
    }

    // Build query - filter by status if provided, or only published products
    let query = supabase.from('webshop_data').select('*');
    
    if (requestBody?.status) {
      query = query.eq('status', requestBody.status);
    } else {
      // Default: only sync published products
      query = query.eq('status', 'published');
    }

    if (requestBody?.uuids && Array.isArray(requestBody.uuids)) {
      query = query.in('uuid', requestBody.uuids);
    }

    const { data: webshopProducts, error: dbError } = await query;

    if (dbError) {
      console.error('[Sync] ❌ Database error:', dbError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch webshop products',
          message: dbError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webshopProducts || webshopProducts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No webshop products found to sync',
          hint: 'Ensure products exist in webshop_data table with status="published"',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`[Sync] Found ${webshopProducts.length} webshop product(s) to sync`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ uuid: string; error: string }>,
    };

    // Helper function to generate SKU from webshop product
    const generateSKU = (product: any): string => {
      // Use UUID as base, but ensure it meets SKU requirements
      // SKU must be 3-50 characters, unique, and not contain "::" or "||"
      let sku = product.uuid?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50) || '';
      
      // If UUID is too short or empty, use Name
      if (sku.length < 3) {
        sku = (product.Name || 'WSHOP').replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
      }
      
      // Ensure minimum length of 3
      if (sku.length < 3) {
        sku = `WS${sku}`.substring(0, 50);
      }
      
      // Ensure it doesn't contain forbidden characters
      sku = sku.replace(/::/g, '-').replace(/\|\|/g, '-');
      
      return sku;
    };

    // Sync each product to Stoqflow
    let processedCount = 0;
    let consecutiveRateLimitErrors = 0;
    const maxBackoffDelay = 30000; // Maximum 30 seconds delay (increased from 10s)

    for (const product of webshopProducts) {
      processedCount++;
      const productIndex = `${processedCount}/${webshopProducts.length}`;
      
      try {
        const productName = product.Name || product.name_en || 'Unnamed Product';
        const productDescription = product.Description || product.description_en || undefined;
        const priceValue = parseFloat((product['Price (EUR)'] || product.price || '0').toString().replace(',', '.'));

        // Generate SKU
        const sku = generateSKU(product);
        console.info(`[Sync] [${productIndex}] Processing: ${productName} (${product.uuid})`);

        // Truncate name to 100 characters if needed
        const truncatedName = productName.substring(0, 100);

        // Map webshop product to Stoqflow format
        // Note: custom_fields cannot be set during product creation
        // They will be added via update after creation
        const stoqflowProduct: any = {
          type: 'basic',
          sku: sku,
          name: truncatedName,
          description: productDescription || undefined,
          retail_price: priceValue > 0 ? priceValue : undefined,
          brand_id: brandIdToUse,
        };

        // Check if product already exists in Stoqflow to avoid duplicates
        const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;
        const productsEndpoint = `${apiBaseUrl}/products`;
        
        // Check for existing product by SKU
        console.info(`[Sync] [${productIndex}] Checking for existing product with SKU: ${sku}`);
        let existingProductId: string | null = null;
        
        try {
          const checkRes = await fetch(`${productsEndpoint}?sku=${encodeURIComponent(sku)}&fields=*`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${basicAuth}`,
            },
          });

          if (checkRes.ok) {
            try {
              const checkData = await checkRes.json();
              if (checkData && Array.isArray(checkData) && checkData.length > 0) {
                // Product with this SKU already exists
                existingProductId = checkData[0]?._id || null;
                if (existingProductId) {
                  console.info(`[Sync] [${productIndex}] Found existing product: ${existingProductId}`);
                }
              }
            } catch (parseErr: any) {
              console.warn(`[Sync] [${productIndex}] Failed to parse check response: ${parseErr.message}`);
            }
          } else if (checkRes.status === 429) {
            // Rate limit on check - increase backoff
            consecutiveRateLimitErrors++;
            const backoffDelay = Math.min(
              Math.max(5000, rateLimitDelayMs * Math.pow(2, consecutiveRateLimitErrors)),
              maxBackoffDelay
            );
            console.warn(`[Sync] [${productIndex}] ⚠️ Rate limit on duplicate check. Backing off for ${backoffDelay}ms (${(backoffDelay/1000).toFixed(1)}s)...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        } catch (checkErr: any) {
          console.warn(`[Sync] [${productIndex}] Failed to check for existing product: ${checkErr.message}`);
        }
        
        // Add a delay after duplicate check to avoid rate limits
        // Use at least 1 second delay after each API call
        if (processedCount < webshopProducts.length) {
          const checkDelay = Math.max(1000, Math.floor(rateLimitDelayMs / 2));
          await new Promise(resolve => setTimeout(resolve, checkDelay));
        }

        const requestStartTime = Date.now();
        let stoqflowRes: Response;
        let stoqflowProductId: string = '';

        if (existingProductId) {
          // Update existing product
          console.info(`[Sync] [${productIndex}] Updating existing product...`);
          stoqflowRes = await fetch(`${productsEndpoint}/${existingProductId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${basicAuth}`,
            },
            body: JSON.stringify({
              name: truncatedName,
              description: productDescription || undefined,
              retail_price: priceValue > 0 ? priceValue : undefined,
            }),
          });
          stoqflowProductId = existingProductId;
        } else {
          // Create new product
          console.info(`[Sync] [${productIndex}] Creating new product...`);
          stoqflowRes = await fetch(productsEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${basicAuth}`,
            },
            body: JSON.stringify(stoqflowProduct),
          });
          
          if (stoqflowRes.ok) {
            const createData = await stoqflowRes.json();
            stoqflowProductId = createData._id;
          }
        }

        const requestDuration = Date.now() - requestStartTime;
        console.info(`[Sync] [${productIndex}] Stoqflow API response received (${requestDuration}ms):`, {
          status: stoqflowRes.status,
          statusText: stoqflowRes.statusText,
          ok: stoqflowRes.ok,
          action: existingProductId ? 'update' : 'create',
        });

        if (stoqflowRes.ok) {
          const action = existingProductId ? 'updated' : 'created';
          console.info(`[Sync] [${productIndex}] ✅ Product ${action} in Stoqflow:`, {
            stoqflow_id: stoqflowProductId,
            sku: sku,
            name: truncatedName,
          });

          // Update product with custom_fields (cannot be set during creation)
          try {
            const updateEndpoint = `${apiBaseUrl}/products/${stoqflowProductId}`;
            const customFields = [
              {
                key: 'webshop_uuid',
                value: product.uuid,
              },
              ...(product.stripe_product_id ? [{
                key: 'stripe_product_id',
                value: product.stripe_product_id,
              }] : []),
              ...(product.stripe_price_id ? [{
                key: 'stripe_price_id',
                value: product.stripe_price_id,
              }] : []),
            ];

            const updateRes = await fetch(updateEndpoint, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
              },
              body: JSON.stringify({
                custom_fields: customFields,
              }),
            });

            if (updateRes.ok) {
              console.info(`[Sync] [${productIndex}] ✅ Custom fields added successfully`);
            } else {
              const updateErrorText = await updateRes.text();
              console.warn(`[Sync] [${productIndex}] ⚠️ Failed to add custom fields:`, {
                status: updateRes.status,
                error: updateErrorText,
              });
              // Don't fail the whole sync if custom_fields update fails
            }
          } catch (updateErr: any) {
            console.warn(`[Sync] [${productIndex}] ⚠️ Exception updating custom fields:`, updateErr.message);
            // Don't fail the whole sync if custom_fields update fails
          }

          console.info(`[Sync] [${productIndex}] ✅ SUCCESS - Product synced:`, {
            webshop_uuid: product.uuid,
            stoqflow_id: stoqflowProductId,
            sku: sku,
            name: truncatedName,
          });
          results.success++;
          consecutiveRateLimitErrors = 0;
        } else {
          const errorText = await stoqflowRes.text();
          let errorMessage = errorText;
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorText;
          } catch {
            // Keep original error text
          }
          
          console.error(`[Sync] [${productIndex}] ❌ FAILED:`, {
            webshop_uuid: product.uuid,
            http_status: stoqflowRes.status,
            error_message: errorMessage,
          });

          if (stoqflowRes.status === 429) {
            consecutiveRateLimitErrors++;
            // More aggressive backoff: start with 5 seconds, then increase exponentially
            const backoffDelay = Math.min(
              Math.max(5000, rateLimitDelayMs * Math.pow(2, consecutiveRateLimitErrors)),
              maxBackoffDelay
            );
            console.warn(`[Sync] [${productIndex}] ⚠️ Rate limit hit (${consecutiveRateLimitErrors} consecutive). Backing off for ${backoffDelay}ms (${(backoffDelay/1000).toFixed(1)}s)...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
          
          results.failed++;
          results.errors.push({
            uuid: product.uuid,
            error: `HTTP ${stoqflowRes.status}: ${errorMessage}`,
          });
        }

        // Add delay between requests to avoid rate limiting
        // Use exponential backoff if we've hit rate limits recently
        let delayMs = rateLimitDelayMs;
        if (consecutiveRateLimitErrors > 0) {
          // Increase delay more aggressively after rate limit errors
          delayMs = Math.min(
            Math.max(rateLimitDelayMs * 2, rateLimitDelayMs * Math.pow(2, consecutiveRateLimitErrors)),
            maxBackoffDelay
          );
        }
        
        if (processedCount < webshopProducts.length) {
          console.info(`[Sync] [${productIndex}] Waiting ${delayMs}ms before next product (rate limit errors: ${consecutiveRateLimitErrors})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err: any) {
        console.error(`[Sync] [${productIndex}] ❌ EXCEPTION:`, {
          webshop_uuid: product.uuid,
          error: err.message,
        });
        results.failed++;
        results.errors.push({
          uuid: product.uuid,
          error: err.message || 'Unknown error',
        });
      }
    }

    console.info('[Sync] ========================================');
    console.info('[Sync] Sync completed');
    console.info('[Sync] ========================================');
    console.info('[Sync] Summary:', {
      total_products: webshopProducts.length,
      successful: results.success,
      failed: results.failed,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${results.success} products, ${results.failed} failed`,
        results,
        summary: {
          total: webshopProducts.length,
          successful: results.success,
          failed: results.failed,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Sync] FATAL ERROR:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        error_type: error?.constructor?.name || 'Unknown',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
