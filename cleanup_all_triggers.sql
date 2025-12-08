-- Comprehensive cleanup script
-- Run this in Supabase Dashboard → SQL Editor

-- First, let's see what triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'tours_table_prod';

-- Drop ALL triggers on tours_table_prod
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'tours_table_prod'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON tours_table_prod CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- Drop the webhook function
DROP FUNCTION IF EXISTS sync_tour_to_stripe_webhook() CASCADE;

-- Drop any other related functions
DROP FUNCTION IF EXISTS public.sync_tour_to_stripe_webhook() CASCADE;

-- Verify cleanup (should return 0 rows now)
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'tours_table_prod';

