
-- SQL inserts to test the aftercare-start edge function
-- These inserts create tourbookings that match the aftercare criteria:
-- 1. status = 'accepted'
-- 2. tour_datetime < now (tour date has passed)
-- 3. isCustomerDetailsRequested = false

-- Example 1: Tour that happened yesterday (should trigger aftercare)
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'accepted',
  NOW() - INTERVAL '1 day', -- Tour happened yesterday
  (SELECT id FROM tours_table_prod LIMIT 1), -- Use first available tour
  'antwerpen',
  ARRAY['{"name": "Test Customer", "email": "test@example.com"}'::jsonb],
  false, -- Not yet requested, so aftercare will process it
  'B2C',
  false,
  false
);

-- Example 2: Tour that happened 2 days ago (should trigger aftercare)
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'accepted',
  NOW() - INTERVAL '2 days', -- Tour happened 2 days ago
  (SELECT id FROM tours_table_prod LIMIT 1),
  'gent',
  ARRAY['{"name": "Another Customer", "email": "customer2@example.com"}'::jsonb],
  false, -- Not yet requested
  'B2C',
  false,
  false
);

-- Example 3: Tour that happened 1 week ago (should trigger aftercare)
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'accepted',
  NOW() - INTERVAL '7 days', -- Tour happened 1 week ago
  (SELECT id FROM tours_table_prod LIMIT 1),
  'brugge',
  ARRAY['{"name": "Week Old Customer", "email": "weekold@example.com"}'::jsonb],
  false, -- Not yet requested
  'B2C',
  false,
  false
);

-- Example 4: B2B booking that happened yesterday (should trigger aftercare)
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'accepted',
  NOW() - INTERVAL '1 day',
  (SELECT id FROM tours_table_prod LIMIT 1),
  'brussel',
  ARRAY['{"name": "B2B Customer", "email": "b2b@example.com"}'::jsonb],
  false,
  'B2B',
  false,
  false
);

-- Example 5: Tour that already has isCustomerDetailsRequested = true (should NOT trigger aftercare)
-- This is included to show the difference - this one won't be processed
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'accepted',
  NOW() - INTERVAL '1 day',
  (SELECT id FROM tours_table_prod LIMIT 1),
  'leuven',
  ARRAY['{"name": "Already Processed", "email": "processed@example.com"}'::jsonb],
  true, -- Already requested, so aftercare will skip it
  'B2C',
  false,
  false
);

-- Example 6: Tour with status 'pending' (should NOT trigger aftercare - wrong status)
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'pending', -- Wrong status, won't be processed
  NOW() - INTERVAL '1 day',
  (SELECT id FROM tours_table_prod LIMIT 1),
  'knokke-heist',
  ARRAY['{"name": "Pending Tour", "email": "pending@example.com"}'::jsonb],
  false,
  'B2C',
  false,
  false
);

-- Example 7: Tour in the future (should NOT trigger aftercare - tour hasn't happened yet)
INSERT INTO public.tourbooking (
  status,
  tour_datetime,
  tour_id,
  city,
  invitees,
  isCustomerDetailsRequested,
  booking_type,
  request_tanguy,
  is_aftercare_started
) VALUES (
  'accepted',
  NOW() + INTERVAL '1 day', -- Future tour, won't be processed yet
  (SELECT id FROM tours_table_prod LIMIT 1),
  'mechelen',
  ARRAY['{"name": "Future Tour", "email": "future@example.com"}'::jsonb],
  false,
  'B2C',
  false,
  false
);

-- ============================================================================
-- DATABASE TRIGGER TO CALL AFTERCARE FUNCTION
-- ============================================================================
-- This trigger automatically calls the aftercare-start edge function when
-- a booking is inserted or updated and matches the aftercare criteria:
-- - status = 'accepted'
-- - tour_datetime < now (tour date has passed)
-- - isCustomerDetailsRequested = false

-- Function to call the aftercare-start edge function
CREATE OR REPLACE FUNCTION trigger_aftercare_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if booking matches aftercare criteria:
  -- - status = 'accepted'
  -- - tour_datetime < now (tour date has passed)
  -- - isCustomerDetailsRequested = false (not yet processed)
  IF NEW.status = 'accepted' 
     AND NEW.tour_datetime IS NOT NULL
     AND NEW.tour_datetime < NOW()
     AND (NEW.isCustomerDetailsRequested IS NULL OR NEW.isCustomerDetailsRequested = false) THEN
    
    -- Call the aftercare-start edge function
    -- This will process all eligible bookings, including this one
    PERFORM supabase_functions.http_request(
      'https://rwrfobawfbfsggczofao.supabase.co/functions/v1/aftercare-start',
      'POST',
      '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cmZvYmF3ZmJmc2dnY3pvZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjMyOTY5OSwiZXhwIjoyMDgxNjg5Njk5fQ.EvY5BLMEGOmafzpBbls7vD9X0IdKH4K_KlQGxZastBc"}'::jsonb,
      '{}'::jsonb,
      '5000'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT - check if new booking needs aftercare
CREATE TRIGGER aftercare_check_on_insert
AFTER INSERT ON public.tourbooking
FOR EACH ROW
EXECUTE FUNCTION trigger_aftercare_check();

-- Trigger on UPDATE - check if status change or tour_datetime update triggers aftercare
CREATE TRIGGER aftercare_check_on_update
AFTER UPDATE OF status, tour_datetime, isCustomerDetailsRequested ON public.tourbooking
FOR EACH ROW
WHEN (
  NEW.status = 'accepted' 
  AND NEW.tour_datetime IS NOT NULL
  AND NEW.tour_datetime < NOW()
  AND (NEW.isCustomerDetailsRequested IS NULL OR NEW.isCustomerDetailsRequested = false)
  AND (
    OLD.status IS DISTINCT FROM NEW.status 
    OR OLD.tour_datetime IS DISTINCT FROM NEW.tour_datetime
    OR (OLD.isCustomerDetailsRequested IS DISTINCT FROM NEW.isCustomerDetailsRequested AND NEW.isCustomerDetailsRequested = false)
  )
)
EXECUTE FUNCTION trigger_aftercare_check();

-- ============================================================================
-- NOTES
-- ============================================================================
-- The aftercare-start function runs as a cron job and will automatically
-- pick up bookings matching these criteria:
-- - status = 'accepted'
-- - tour_datetime < now (tour date has passed)
-- - isCustomerDetailsRequested = false (not yet processed)
--
-- To manually trigger the function, you can call it via:
-- POST https://rwrfobawfbfsggczofao.supabase.co/functions/v1/aftercare-start
-- With Authorization header: Bearer <service_role_key>
--
-- The test inserts above create bookings that will be picked up by the cron job
-- when it runs. Examples 1-4 will be processed, examples 5-7 will not.

