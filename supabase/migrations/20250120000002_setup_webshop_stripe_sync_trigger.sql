/*
  # Setup Database Trigger for Webshop to Stripe Sync

  This migration creates a database trigger that automatically calls the sync-webshop-to-stripe
  edge function when products are created, updated, or deleted in the webshop_data table.

  The trigger uses supabase_functions.http_request to call the edge function.
*/

-- Drop existing trigger if it exists (to allow re-running this migration)
DROP TRIGGER IF EXISTS sync_stripe_webshop_trigger ON webshop_data;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS sync_stripe_webshop_webhook();

-- Create function to call the sync-webshop-to-stripe edge function
CREATE OR REPLACE FUNCTION sync_stripe_webshop_webhook()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  function_url text;
  payload jsonb;
  response_status int;
  response_body text;
BEGIN
  -- Get Supabase URL and service role key from environment
  -- These should be set in Supabase Dashboard → Project Settings → Database → Custom Config
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to hardcoded values if environment variables are not set
  -- Replace these with your actual values if needed
  IF supabase_url IS NULL THEN
    supabase_url := 'https://rwrfobawfbfsggczofao.supabase.co';
  END IF;

  -- Build the function URL
  function_url := supabase_url || '/functions/v1/sync-webshop-to-stripe';

  -- Build payload based on trigger operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'webshop_data',
      'record', row_to_json(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'webshop_data',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'table', 'webshop_data',
      'old_record', row_to_json(OLD)
    );
  END IF;

  -- Call the edge function using http_request
  -- Note: This requires the http extension to be enabled
  -- If http extension is not available, use Supabase Dashboard webhooks instead
  BEGIN
    SELECT status, content INTO response_status, response_body
    FROM http((
      'POST',
      function_url,
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || COALESCE(service_role_key, 'YOUR_SERVICE_ROLE_KEY'))
      ],
      'application/json',
      payload::text
    )::http_request);

    -- Log the response (optional, for debugging)
    RAISE NOTICE 'Sync webshop to Stripe: Status %, Response %', response_status, response_body;

  EXCEPTION WHEN OTHERS THEN
    -- If http extension is not available, log error but don't fail the transaction
    RAISE WARNING 'Failed to call sync-webshop-to-stripe function: %. Please set up webhook in Supabase Dashboard instead.', SQLERRM;
  END;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER sync_stripe_webshop_trigger
  AFTER INSERT OR UPDATE OR DELETE ON webshop_data
  FOR EACH ROW
  EXECUTE FUNCTION sync_stripe_webshop_webhook();

-- Add comment
COMMENT ON FUNCTION sync_stripe_webshop_webhook() IS 
  'Triggers sync-webshop-to-stripe edge function when webshop_data changes. ' ||
  'If http extension is not available, use Supabase Dashboard webhooks instead.';

