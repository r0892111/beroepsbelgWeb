import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stoqflowClientId = Deno.env.get('STOQFLOW_CLIENT_ID');
const stoqflowClientSecret = Deno.env.get('STOQFLOW_CLIENT_SECRET');
const stoqflowShopId = Deno.env.get('STOQFLOW_SHOP_ID');
const stoqflowBrandId = Deno.env.get('STOQFLOW_BRAND_ID');
const stoqflowBaseUrl = Deno.env.get('STOQFLOW_BASE_URL');
// Rate limiting: delay between API requests (ms)
// API consumers have lower burst budget and higher time between requests
// Increased default to 3000ms (3 seconds) to avoid rate limits
const rateLimitDelayMs = parseInt(Deno.env.get('STOQFLOW_RATE_LIMIT_DELAY_MS') || '3000', 10);

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Stripe to Stoqflow Sync',
    version: '1.0.0',
  },
});

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

    // Validate that base URL looks like a Stoqflow server URL
    if (!stoqflowBaseUrl.includes('stoqflow.com') && !stoqflowBaseUrl.includes('stoqflow')) {
      console.warn('[Sync] ⚠️ WARNING: STOQFLOW_BASE_URL does not appear to be a Stoqflow server URL:', stoqflowBaseUrl);
      console.warn('[Sync] Expected format: https://yourcompany.stoqflow.com');
    }

    // Handle test_connection request (for connection status check from admin dashboard)
    // Parse request body once - check if it's a test request
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch {
      // Body might be empty or invalid JSON, that's okay
    }

    if (requestBody.test_connection === true) {
      // Test connection by fetching company structure
      const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;
      const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
      const basicAuth = btoa(credentials);

      try {
        const testResponse = await fetch(`${apiBaseUrl}/company`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`,
          },
        });

        if (testResponse.ok) {
          return new Response(
            JSON.stringify({ 
              success: true,
              connected: true,
              message: 'Stoqflow connection successful'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await testResponse.text().catch(() => 'Unknown error');
          return new Response(
            JSON.stringify({ 
              success: false,
              connected: false,
              error: `Stoqflow API returned ${testResponse.status}: ${errorText.substring(0, 200)}`
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (testError: any) {
        return new Response(
          JSON.stringify({ 
            success: false,
            connected: false,
            error: `Connection test failed: ${testError.message}`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch brand_id from Stoqflow API using /company endpoint
    console.info('[Sync] ========================================');
    console.info('[Sync] Step 1: Fetching company structure from Stoqflow API');
    console.info('[Sync] ========================================');
    console.info('[Sync] Stoqflow base URL:', stoqflowBaseUrl);
    console.info('[Sync] Authentication: Basic Auth with client_id:client_secret');
    console.info('[Sync] Client ID present:', !!stoqflowClientId);
    console.info('[Sync] Client Secret present:', !!stoqflowClientSecret);
    console.info('[Sync] Brand ID from env:', stoqflowBrandId || 'NOT SET');
    
    const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
    const basicAuth = btoa(credentials);
    console.info('[Sync] Basic Auth header created (length):', basicAuth.length);
    
    let fetchedBrandId: string | null = null;
    let companyResponseData: any = null;
    let apiError: { message: string; details?: any } | null = null;
    
    try {
      // Use /company endpoint to get hierarchical company structure with brands and shops
      // According to API docs: /company returns hierarchical representation of company, brands and shops
      const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;
      const companyEndpoint = `${apiBaseUrl}/company`;
      
      console.info('[Sync] Using Stoqflow base URL:', stoqflowBaseUrl);
      console.info('[Sync] API base URL:', apiBaseUrl);
      console.info('[Sync] Fetching company structure from:', companyEndpoint);
      
      const companyRes = await fetch(companyEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
      });
      
      console.info('[Sync] Company API response received:', {
        status: companyRes.status,
        statusText: companyRes.statusText,
        ok: companyRes.ok,
        headers: Object.fromEntries(companyRes.headers.entries()),
      });

      const responseText = await companyRes.text();
      console.info('[Sync] Response body (raw):', {
        length: responseText.length,
        preview: responseText.substring(0, 500),
      });

      if (companyRes.ok) {
        try {
          companyResponseData = JSON.parse(responseText);
          console.info('[Sync] Response parsed as JSON successfully');
          console.info('[Sync] Response structure:', {
            keys: Object.keys(companyResponseData),
            has_brands: !!companyResponseData.brands,
            brands_count: Array.isArray(companyResponseData.brands) ? companyResponseData.brands.length : 0,
            company_name: companyResponseData.name || 'N/A',
          });
          
          // Extract brand_id from company structure
          // According to API docs, /company returns: { _id, name, address, brands: [...] }
          if (companyResponseData.brands && Array.isArray(companyResponseData.brands) && companyResponseData.brands.length > 0) {
            // If shop_id is provided, try to find brand associated with that shop
            let selectedBrand = companyResponseData.brands[0];
            
            if (stoqflowShopId) {
              console.info('[Sync] Looking for brand associated with shop_id:', stoqflowShopId);
              // Brands may have shops array, or we might need to check shops within brands
              for (const brand of companyResponseData.brands) {
                if (brand.shops && Array.isArray(brand.shops)) {
                  const matchingShop = brand.shops.find((s: any) => s._id === stoqflowShopId || s.id === stoqflowShopId);
                  if (matchingShop) {
                    selectedBrand = brand;
                    console.info('[Sync] Found brand associated with shop_id');
                    break;
                  }
                }
              }
            }
            
            fetchedBrandId = selectedBrand._id || selectedBrand.id || null;
            console.info('[Sync] ✅ Brand selected from company structure:', {
              brand_id: fetchedBrandId,
              brand_name: selectedBrand.name || 'N/A',
              brand_structure: {
                _id: selectedBrand._id,
                name: selectedBrand.name,
                has_shops: !!selectedBrand.shops,
                shops_count: Array.isArray(selectedBrand.shops) ? selectedBrand.shops.length : 0,
              },
            });
          } else {
            console.warn('[Sync] ⚠️ WARNING: No brands found in company structure');
            console.warn('[Sync] Full company response:', JSON.stringify(companyResponseData, null, 2));
          }
        } catch (parseError: any) {
          console.error('[Sync] ❌ Failed to parse company response as JSON:', {
            error_type: parseError?.constructor?.name,
            error_message: parseError?.message,
            response_text: responseText,
          });
        }
      } else {
        const errorText = responseText;
        const isHtmlResponse = errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html');
        
        console.error('[Sync] ❌ Company API request failed:', {
          status: companyRes.status,
          statusText: companyRes.statusText,
          is_html_response: isHtmlResponse,
          response_preview: errorText.substring(0, 500),
        });
        
        if (companyRes.status === 404) {
          if (isHtmlResponse) {
            const errorMsg = 'STOQFLOW_BASE_URL is pointing to the wrong server. Received HTML response instead of JSON API response.';
            console.error('[Sync] ❌ CRITICAL: Received HTML response instead of JSON API response!');
            console.error('[Sync] 💡 This means STOQFLOW_BASE_URL is pointing to the wrong server.');
            console.error('[Sync] 💡 Current STOQFLOW_BASE_URL:', stoqflowBaseUrl);
            console.error('[Sync] 💡 Expected: Your Stoqflow server URL (e.g., https://yourcompany.stoqflow.com)');
            console.error('[Sync] 💡 The URL should point to your Stoqflow instance, NOT your website.');
            console.error('[Sync] 💡 Fix: Set STOQFLOW_BASE_URL to your Stoqflow server URL in Supabase dashboard');
            console.error('[Sync] 💡 Alternative: Set STOQFLOW_BRAND_ID environment variable to bypass API lookup');
            
            apiError = {
              message: errorMsg,
              details: {
                current_url: stoqflowBaseUrl,
                expected_format: 'https://yourcompany.stoqflow.com',
                suggestion: 'Set STOQFLOW_BASE_URL to your Stoqflow server URL, or set STOQFLOW_BRAND_ID to bypass API lookup',
              }
            };
          } else {
            apiError = {
              message: 'Company endpoint not found (404). Check STOQFLOW_BASE_URL configuration.',
              details: {
                current_url: stoqflowBaseUrl,
                suggestion: 'Ensure STOQFLOW_BASE_URL is set to your Stoqflow server URL (e.g., https://dundermifflin.stoqflow.com)',
              }
            };
            console.error('[Sync] 💡 Suggestion: The /company endpoint might not be available or URL is incorrect.');
            console.error('[Sync] 💡 Ensure STOQFLOW_BASE_URL is set to your Stoqflow server URL (e.g., https://dundermifflin.stoqflow.com)');
            console.error('[Sync] 💡 Alternative: Set STOQFLOW_BRAND_ID environment variable to bypass API lookup');
          }
        } else if (companyRes.status === 401 || companyRes.status === 403) {
          apiError = {
            message: 'Authentication failed. Check STOQFLOW_CLIENT_ID and STOQFLOW_CLIENT_SECRET',
          };
          console.error('[Sync] 💡 Authentication failed. Check STOQFLOW_CLIENT_ID and STOQFLOW_CLIENT_SECRET');
        } else {
          apiError = {
            message: `API request failed with status ${companyRes.status}`,
            details: {
              status: companyRes.status,
              statusText: companyRes.statusText,
            }
          };
        }
      }
    } catch (err: any) {
      console.error('[Sync] ❌ Exception while fetching company structure:', {
        error_type: err?.constructor?.name,
        error_message: err?.message,
        error_stack: err?.stack,
      });
    }
    
    console.info('[Sync] Brand fetch result:', {
      fetched_brand_id: fetchedBrandId,
      env_brand_id: stoqflowBrandId,
      will_use: fetchedBrandId || stoqflowBrandId || 'NONE',
    });

    // Use fetched brand_id or fall back to environment variable
    const brandIdToUse = fetchedBrandId || stoqflowBrandId;
    
    console.info('[Sync] ========================================');
    console.info('[Sync] Brand ID resolution:');
    console.info('[Sync] ========================================');
    console.info('[Sync] Fetched from API:', fetchedBrandId || 'NOT AVAILABLE');
    console.info('[Sync] From environment:', stoqflowBrandId || 'NOT SET');
    console.info('[Sync] Final brand_id to use:', brandIdToUse || 'NONE');
    console.info('[Sync] ========================================');
    
    if (!brandIdToUse) {
      console.error('[Sync] ❌ FATAL: No brand_id available');
      console.error('[Sync] Debug info:', {
        fetched_brand_id: fetchedBrandId,
        env_brand_id: stoqflowBrandId,
        stoqflow_base_url: stoqflowBaseUrl,
        company_api_response: companyResponseData ? JSON.stringify(companyResponseData, null, 2).substring(0, 1000) : 'NO RESPONSE',
        api_error: apiError,
      });
      
      const errorResponse: any = {
        error: 'Brand ID not available',
        message: apiError?.message || 'Could not fetch brand_id from Stoqflow API and STOQFLOW_BRAND_ID is not set.',
        debug: {
          fetched_brand_id: fetchedBrandId,
          env_brand_id: stoqflowBrandId,
          stoqflow_base_url: stoqflowBaseUrl,
          company_api_response_preview: companyResponseData ? JSON.stringify(companyResponseData).substring(0, 500) : null,
        }
      };

      if (apiError) {
        errorResponse.api_error = apiError;
        errorResponse.suggestion = apiError.details?.suggestion || 'Set STOQFLOW_BRAND_ID environment variable to bypass API lookup';
      } else {
        errorResponse.suggestion = 'Set STOQFLOW_BRAND_ID environment variable to bypass API lookup, or fix STOQFLOW_BASE_URL configuration';
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.info('[Sync] ✅ Brand ID resolved successfully:', brandIdToUse);

    // Note: shop_id is not needed for product creation
    // Products are linked to brands, not shops. Orders are linked to shops.
    if (stoqflowShopId) {
      console.info('[Sync] Shop ID configured (not used for products, but may be used for orders):', stoqflowShopId);
    }

    console.info('[Sync] ========================================');
    console.info('[Sync] Starting Stripe to Stoqflow product sync');
    console.info('[Sync] ========================================');
    console.info('[Sync] Environment check:', {
      hasClientId: !!stoqflowClientId,
      hasClientSecret: !!stoqflowClientSecret,
      hasShopId: !!stoqflowShopId,
      shopId: stoqflowShopId || 'NOT SET (optional - not used for products)',
      brandId: brandIdToUse || 'NOT AVAILABLE',
      brandIdSource: fetchedBrandId ? 'FETCHED_FROM_API' : (stoqflowBrandId ? 'ENV_VAR' : 'NOT_SET'),
      baseUrl: stoqflowBaseUrl,
    });

    // Fetch products from Stripe
    // Option 1: Check if specific product IDs are provided in request body
    // Option 2: Check if test product ID is set in environment variable
    // Option 3: Fetch all active products
    let stripeProducts: Stripe.Product[] = [];
    let requestBody: any = null;
    
    // Try to parse request body if present (optional)
    // Note: In edge functions, body can only be read once, so we handle it here
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const bodyText = await req.text();
        if (bodyText && bodyText.trim()) {
          requestBody = JSON.parse(bodyText);
          console.info('[Sync] Request body parsed:', { has_product_ids: !!requestBody?.product_ids || !!requestBody?.productIds });
        }
      } catch (err: any) {
        // Request body parsing failed - continue without it
        console.warn('[Sync] Failed to parse request body:', err.message);
      }
    }
    
    const testProductId = Deno.env.get('STOQFLOW_TEST_PRODUCT_ID');
    const productIdsFromRequest = requestBody?.product_ids || requestBody?.productIds;
    
    if (productIdsFromRequest && Array.isArray(productIdsFromRequest) && productIdsFromRequest.length > 0) {
      // Fetch specific products from request body
      console.info(`[Sync] Fetching ${productIdsFromRequest.length} product(s) from request body`);
      for (const productId of productIdsFromRequest) {
        try {
          const product = await stripe.products.retrieve(productId);
          stripeProducts.push(product);
          console.info(`[Sync] Successfully retrieved product: ${product.name} (${product.id})`);
        } catch (err: any) {
          console.error(`[Sync] Failed to retrieve product ${productId}:`, {
            error: err.message,
            error_type: err?.constructor?.name,
          });
          // Continue with other products instead of failing completely
        }
      }
    } else if (testProductId) {
      // Fetch test product from environment variable
      console.info(`[Sync] TEST MODE: Fetching single product from env: ${testProductId}`);
      try {
        const product = await stripe.products.retrieve(testProductId);
        stripeProducts = [product];
        console.info(`[Sync] Successfully retrieved test product: ${product.name} (${product.id})`);
      } catch (err: any) {
        console.error(`[Sync] Failed to retrieve test product ${testProductId}:`, {
          error: err.message,
          error_type: err?.constructor?.name,
        });
        return new Response(
          JSON.stringify({ 
            error: `Failed to retrieve test product: ${err.message}`,
            product_id: testProductId,
            hint: 'Check STOQFLOW_TEST_PRODUCT_ID environment variable or provide product_ids in request body',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Fetch all active products from Stripe
      console.info(`[Sync] Fetching all active products from Stripe...`);
      try {
        const productsList = await stripe.products.list({ 
          active: true,
          limit: 100, // Limit to first 100 products
        });
        stripeProducts = Array.isArray(productsList?.data) ? productsList.data : [];
        console.info(`[Sync] Successfully retrieved ${stripeProducts.length} product(s) from Stripe`);
      } catch (err: any) {
        console.error(`[Sync] Failed to retrieve products from Stripe:`, {
          error: err.message,
          error_type: err?.constructor?.name,
        });
        return new Response(
          JSON.stringify({ 
            error: `Failed to retrieve products from Stripe: ${err.message}`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Ensure stripeProducts is always an array
    if (!Array.isArray(stripeProducts)) {
      stripeProducts = [];
    }
    
    if (stripeProducts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No products found to sync',
          hint: 'Provide product_ids in request body, set STOQFLOW_TEST_PRODUCT_ID, or ensure Stripe has active products',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.info(`[Sync] ========================================`);
    console.info(`[Sync] Products to sync: ${stripeProducts.length}`);
    console.info(`[Sync] Rate limit delay: ${rateLimitDelayMs}ms between requests`);
    console.info(`[Sync] Starting sync process...`);
    console.info(`[Sync] ========================================`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ productId: string; error: string }>,
    };

    // Helper function to generate SKU from Stripe product
    const generateSKU = (product: Stripe.Product): string => {
      // Use Stripe product ID as base, but ensure it meets SKU requirements
      // SKU must be 3-50 characters, unique, and not contain "::" or "||"
      const productId = product?.id || '';
      if (!productId) {
        // Fallback to timestamp-based SKU if no ID
        return `STR${Date.now().toString().slice(-10)}`;
      }
      
      let sku = productId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
      
      // Ensure minimum length of 3
      if (sku.length < 3) {
        sku = `STR${sku}`.substring(0, 50);
      }
      
      // Ensure it doesn't contain forbidden characters
      sku = sku.replace(/::/g, '-').replace(/\|\|/g, '-');
      
      return sku;
    };

    // Sync each product to Stoqflow
    let processedCount = 0;
    let consecutiveRateLimitErrors = 0;
    const maxBackoffDelay = 30000; // Maximum 30 seconds delay (increased from 10s)
    const totalProductsCount = Array.isArray(stripeProducts) ? stripeProducts.length : 0;
    
    for (const product of stripeProducts) {
      processedCount++;
      const productIndex = `${processedCount}/${totalProductsCount}`;
      
      try {
        // Validate product object
        if (!product || !product.id) {
          console.error(`[Sync] [${productIndex}] Invalid product object:`, product);
          results.failed++;
          results.errors.push({
            productId: product?.id || 'unknown',
            error: 'Invalid product object - missing id',
          });
          continue;
        }

        const productNameDisplay = product.name || 'Unnamed Product';
        console.info(`[Sync] [${productIndex}] Processing product: ${product.id} - "${productNameDisplay}"`);
        
        // Get the default price for this product
        let defaultPrice: Stripe.Price | null = null;
        if (product.default_price) {
          console.info(`[Sync] [${productIndex}] Fetching price for product ${product.id}...`);
          try {
            if (typeof product.default_price === 'string') {
              defaultPrice = await stripe.prices.retrieve(product.default_price);
            } else {
              defaultPrice = product.default_price as Stripe.Price;
            }
            console.info(`[Sync] [${productIndex}] Price retrieved: ${defaultPrice.unit_amount ? (defaultPrice.unit_amount / 100) : 'N/A'} ${defaultPrice.currency || 'EUR'}`);
          } catch (priceErr: any) {
            console.warn(`[Sync] [${productIndex}] Failed to retrieve price: ${priceErr.message}`);
            defaultPrice = null;
          }
        } else {
          console.warn(`[Sync] [${productIndex}] No default price found for product ${product.id}`);
        }

        // Generate SKU from Stripe product ID
        const sku = generateSKU(product);
        console.info(`[Sync] [${productIndex}] Generated SKU: ${sku}`);
        
        // Truncate name to 100 characters if needed
        // Handle cases where product.name might be null or undefined
        const productNameRaw = product.name || 'Unnamed Product';
        const productName = productNameRaw.substring(0, 100);
        if (productNameRaw.length > 100) {
          console.warn(`[Sync] [${productIndex}] Product name truncated from ${productNameRaw.length} to 100 characters`);
        }

        // Map Stripe product to Stoqflow format according to API documentation
        const retailPrice = defaultPrice ? (defaultPrice.unit_amount || 0) / 100 : undefined;
        const stoqflowProduct: any = {
          type: 'basic', // Default to basic product type
          sku: sku,
          name: productName,
          description: (product.description && product.description.trim()) ? product.description : undefined,
          retail_price: retailPrice,
          // Note: custom_fields cannot be set during product creation
          // They will be added via update after creation
        };

        // Add brand_id (required by Stoqflow API)
        // According to API docs: products are linked to brands, not shops
        stoqflowProduct.brand_id = brandIdToUse;
        console.info(`[Sync] [${productIndex}] Using brand_id: ${brandIdToUse}`);

        console.info(`[Sync] [${productIndex}] Product payload prepared:`, {
          sku: sku,
          name: productName,
          hasDescription: !!product.description,
          retailPrice: retailPrice,
          note: 'Custom fields will be added after product creation',
        });

        // Check if product already exists in Stoqflow to avoid duplicates
        // Note: Stoqflow API uses basicAuth with client ID and secret
        // Format: base64(client_id:client_secret)
        const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
        const basicAuth = btoa(credentials);
        
        // Construct API URL using configured base URL
        // API URL format: {base_url}/api/v2/{endpoint}
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
              // Continue with creation if check fails
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
          // Continue with creation if check fails
        }
        
        // Add a delay after duplicate check to avoid rate limits
        // Use at least 1 second delay after each API call
        if (processedCount < totalProductsCount) {
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
              name: productName,
              description: product.description || undefined,
              retail_price: retailPrice,
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
            name: productName,
          });

          // Update product with custom_fields (cannot be set during creation)
          try {
            const updateEndpoint = `${apiBaseUrl}/products/${stoqflowProductId}`;
            const customFields = [
              {
                key: 'stripe_product_id',
                value: product.id,
              },
              ...(defaultPrice ? [{
                key: 'stripe_price_id',
                value: defaultPrice.id,
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

          console.info(`[Sync] [${productIndex}] ✅ SUCCESS - Product synced to Stoqflow:`, {
            stripe_product_id: product.id,
            stoqflow_id: stoqflowProductId,
            sku: sku,
            name: productName,
            retail_price: retailPrice,
          });
          results.success++;
          // Reset rate limit error counter on success
          consecutiveRateLimitErrors = 0;
        } else {
          const errorText = await stoqflowRes.text();
          let errorMessage = errorText;
          let errorDetails: any = {};
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorText;
            errorDetails = errorJson;
          } catch {
            // Keep original error text if not JSON
            errorMessage = errorText;
          }
          
          console.error(`[Sync] [${productIndex}] ❌ FAILED - Product sync failed:`, {
            stripe_product_id: product.id,
            product_name: productName,
            sku: sku,
            http_status: stoqflowRes.status,
            http_status_text: stoqflowRes.statusText,
            error_message: errorMessage,
            error_details: errorDetails,
            request_duration_ms: requestDuration,
          });
          
          // Check if this is a rate limit error (429)
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
            productId: product.id,
            error: `HTTP ${stoqflowRes.status}: ${errorMessage}`,
          });
        }

        // Add delay between requests to avoid rate limiting
        // Use exponential backoff if we've hit rate limits recently
        let delayMs = rateLimitDelayMs;
        if (consecutiveRateLimitErrors > 0) {
          // Increase delay more aggressively after rate limit errors
          // Start with at least 2x the base delay, then increase exponentially
          delayMs = Math.min(
            Math.max(rateLimitDelayMs * 2, rateLimitDelayMs * Math.pow(2, consecutiveRateLimitErrors)),
            maxBackoffDelay
          );
        }
        
        // Only delay if there are more products to process
        if (processedCount < totalProductsCount) {
          console.info(`[Sync] [${productIndex}] Waiting ${delayMs}ms before next product (rate limit errors: ${consecutiveRateLimitErrors})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err: any) {
        const productId = product?.id || 'unknown';
        const productName = product?.name || 'Unknown Product';
        console.error(`[Sync] [${productIndex}] ❌ EXCEPTION - Unexpected error syncing product:`, {
          stripe_product_id: productId,
          product_name: productName,
          error_type: err?.constructor?.name || 'Unknown',
          error_message: err?.message || 'Unknown error',
          error_stack: err?.stack || 'No stack trace',
        });
        results.failed++;
        results.errors.push({
          productId: productId,
          error: err?.message || 'Unknown error',
        });
      }
    }

    console.info('[Sync] ========================================');
    console.info('[Sync] Sync completed');
    console.info('[Sync] ========================================');
    console.info('[Sync] Summary:', {
      total_products: totalProductsCount,
      successful: results.success,
      failed: results.failed,
      success_rate: totalProductsCount > 0 ? `${((results.success / totalProductsCount) * 100).toFixed(1)}%` : '0%',
    });
    
    if (results.errors.length > 0) {
      console.warn('[Sync] Failed products:', results.errors);
    }
    
    console.info('[Sync] ========================================');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${results.success} products, ${results.failed} failed`,
        results,
        summary: {
          total: totalProductsCount,
          successful: results.success,
          failed: results.failed,
          success_rate: totalProductsCount > 0 ? ((results.success / totalProductsCount) * 100).toFixed(1) + '%' : '0%',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Sync] ========================================');
    console.error('[Sync] FATAL ERROR - Sync process failed');
    console.error('[Sync] ========================================');
    console.error('[Sync] Error details:', {
      error_type: error?.constructor?.name || 'Unknown',
      error_message: error?.message || 'Unknown error',
      error_stack: error?.stack || 'No stack trace',
    });
    console.error('[Sync] ========================================');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        error_type: error?.constructor?.name || 'Unknown',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
