-- Clean up existing webhook trigger and function
-- Run this in Supabase Dashboard → SQL Editor

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_tour_to_stripe_trigger ON tours_table_prod;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS sync_tour_to_stripe_webhook();

-- Verify triggers are removed
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tours_table_prod';

-- This query should return empty results if cleanup was successful




