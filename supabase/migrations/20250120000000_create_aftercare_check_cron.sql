/*
  # Create Cron Job for Aftercare Check
  
  1. Changes
    - Creates a cron job that runs the aftercare-check edge function
    - Runs 1 minute past every hour (cron: 1 * * * *)
    - Calls the Supabase edge function to check for completed tours
  
  2. Notes
    - This checks if tours have finished (tour_datetime + duration < now)
    - Only processes bookings where isCustomerDetailsRequested = false
    - Sends bookings to N8N webhook for aftercare processing
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to run aftercare-check function
-- Runs 1 minute past every hour: 00:01, 01:01, 02:01, etc.
-- Cron format: minute hour day month weekday
-- '1 * * * *' = 1 minute past every hour
SELECT cron.schedule(
  'aftercare-check-hourly',
  '1 * * * *', -- 1 minute past every hour
  $$
  SELECT
    net.http_post(
      url := 'https://rwrfobawfbfsggczofao.supabase.co/functions/v1/aftercare-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Optional: Add a comment to document the cron job
COMMENT ON EXTENSION pg_cron IS 'Scheduled job to check for completed tours and trigger aftercare';

