import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stoqflowClientId = Deno.env.get('STOQFLOW_CLIENT_ID');
const stoqflowClientSecret = Deno.env.get('STOQFLOW_CLIENT_SECRET');
const stoqflowBaseUrl = Deno.env.get('STOQFLOW_BASE_URL');

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Match] Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  });
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Log request for debugging
    console.info('[Match] Request received:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get('authorization'),
    });

    // Check Supabase credentials first
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials not configured',
          missing: {
            url: !supabaseUrl,
            serviceKey: !supabaseServiceKey,
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stoqflowClientId || !stoqflowClientSecret || !stoqflowBaseUrl) {
      const errorMsg = {
        error: 'Stoqflow credentials not configured',
        missing: {
          clientId: !stoqflowClientId,
          clientSecret: !stoqflowClientSecret,
          baseUrl: !stoqflowBaseUrl,
        }
      };
      console.error('[Match] Missing credentials:', errorMsg);
      return new Response(
        JSON.stringify(errorMsg),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
    const basicAuth = btoa(credentials);
    const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;

    // Helper function to generate SKU (exact same as sync-webshop-to-stoqflow)
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

    console.info('[Match] Fetching all Stoqflow products...');
    
    // Fetch all products from Stoqflow
    const productsEndpoint = `${apiBaseUrl}/products?fields=*&limit=1000`;
    const productsRes = await fetch(productsEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!productsRes.ok) {
      const errorText = await productsRes.text();
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Stoqflow products',
          status: productsRes.status,
          details: errorText
        }),
        { status: productsRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      const stoqflowProducts: any[] = await productsRes.json();
      console.info(`[Match] Found ${stoqflowProducts.length} Stoqflow products`);
      
      // Log sample of Stoqflow products for debugging
      if (stoqflowProducts.length > 0) {
        console.info('[Match] Sample Stoqflow products (first 5):', 
          stoqflowProducts.slice(0, 5).map(p => ({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            custom_fields: p.custom_fields?.filter((f: any) => f.key === 'webshop_uuid') || []
          }))
        );
      }

      // Fetch all webshop products
    console.info('[Match] Fetching webshop products from database...');
    console.info('[Match] Supabase client initialized:', {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
      hasServiceKey: !!supabaseServiceKey,
    });
    
    try {
      const { data: webshopProducts, error: dbError } = await supabase
        .from('webshop_data')
        .select('uuid, Name, stoqflow_id');

      if (dbError) {
        console.error('[Match] Database error:', {
          message: dbError.message,
          code: dbError.code,
          hint: dbError.hint,
          details: dbError.details,
        });
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch webshop products', 
            details: dbError.message,
            code: dbError.code,
            hint: dbError.hint,
            full_error: JSON.stringify(dbError, null, 2)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!webshopProducts) {
        console.warn('[Match] No webshop products returned (null)');
        return new Response(
          JSON.stringify({ 
            error: 'No webshop products found',
            hint: 'Check if webshop_data table exists and has data'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.info(`[Match] Found ${webshopProducts.length} webshop products`);
      
      // Continue with matching logic...
      const stoqflowBySku = new Map<string, any>();
      const stoqflowByCustomField = new Map<string, any>();
      const stoqflowByName = new Map<string, any>(); // For fuzzy name matching

      for (const stoqflowProduct of stoqflowProducts) {
        // Index by SKU
        if (stoqflowProduct.sku) {
          stoqflowBySku.set(stoqflowProduct.sku.toLowerCase(), stoqflowProduct);
        }

        // Index by custom_fields webshop_uuid
        if (stoqflowProduct.custom_fields && Array.isArray(stoqflowProduct.custom_fields)) {
          const webshopUuidField = stoqflowProduct.custom_fields.find((f: any) => f.key === 'webshop_uuid');
          if (webshopUuidField?.value) {
            stoqflowByCustomField.set(webshopUuidField.value.toLowerCase(), stoqflowProduct);
          }
        }
        
        // Index by normalized name for fuzzy matching
        if (stoqflowProduct.name) {
          const normalizedName = stoqflowProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedName.length > 3) {
            stoqflowByName.set(normalizedName, stoqflowProduct);
          }
        }
      }
      
      console.info(`[Match] Indexed Stoqflow products: ${stoqflowBySku.size} by SKU, ${stoqflowByCustomField.size} by custom_field, ${stoqflowByName.size} by name`);

      // Match webshop products to Stoqflow products
      const matches: Array<{ uuid: string; stoqflow_id: string; match_method: string }> = [];
      const unmatched: Array<{ uuid: string; name: string; generated_sku: string }> = [];

      for (const webshopProduct of webshopProducts || []) {
        const uuid = webshopProduct.uuid;
        const generatedSku = generateSKU(webshopProduct); // Pass full product object

        // Try to find match by custom_fields first (most reliable)
        const matchByCustomField = stoqflowByCustomField.get(uuid.toLowerCase());
        if (matchByCustomField) {
          matches.push({
            uuid,
            stoqflow_id: matchByCustomField._id,
            match_method: 'custom_field_webshop_uuid'
          });
          continue;
        }

        // Try to find match by SKU
        const matchBySku = stoqflowBySku.get(generatedSku.toLowerCase());
        if (matchBySku) {
          matches.push({
            uuid,
            stoqflow_id: matchBySku._id,
            match_method: 'sku'
          });
          continue;
        }

        // Try fuzzy name matching as fallback
        const productName = webshopProduct.Name || '';
        if (productName) {
          const normalizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchByName = stoqflowByName.get(normalizedName);
          if (matchByName) {
            matches.push({
              uuid,
              stoqflow_id: matchByName._id,
              match_method: 'name_fuzzy'
            });
            continue;
          }
        }

        // No match found
        unmatched.push({
          uuid,
          name: webshopProduct.Name || 'Unknown',
          generated_sku: generatedSku
        });
      }

      console.info(`[Match] Matched ${matches.length} products, ${unmatched.length} unmatched`);

      // Generate SQL migration
      const migrationSQL = `-- Migration: Match webshop products to Stoqflow products
-- Generated: ${new Date().toISOString()}
-- Matched: ${matches.length} products
-- Unmatched: ${unmatched.length} products

-- Add stoqflow_id column if it doesn't exist
ALTER TABLE webshop_data ADD COLUMN IF NOT EXISTS stoqflow_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webshop_data_stoqflow_id ON webshop_data(stoqflow_id);

-- Update matched products
${matches.map(m => `UPDATE webshop_data SET stoqflow_id = '${m.stoqflow_id}' WHERE uuid = '${m.uuid}'; -- ${m.match_method}`).join('\n')}

-- Note: Unmatched products (${unmatched.length}):
${unmatched.map(u => `--   - ${u.name} (UUID: ${u.uuid}, Generated SKU: ${u.generated_sku})`).join('\n')}
`;

      // Include diagnostic information
      const diagnosticInfo = {
        stoqflow_product_count: stoqflowProducts.length,
        stoqflow_skus_sample: stoqflowProducts.slice(0, 10).map(p => p.sku).filter(Boolean),
        webshop_product_count: webshopProducts?.length || 0,
      };

      return new Response(
        JSON.stringify({
          success: true,
          matched: matches.length,
          unmatched: unmatched.length,
          matches: matches,
          unmatched_products: unmatched,
          migration_sql: migrationSQL,
          diagnostic: diagnosticInfo
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (queryError: any) {
      console.error('[Match] Query exception:', queryError);
      return new Response(
        JSON.stringify({ 
          error: 'Exception while fetching webshop products',
          message: queryError.message,
          stack: queryError.stack
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[Match] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
