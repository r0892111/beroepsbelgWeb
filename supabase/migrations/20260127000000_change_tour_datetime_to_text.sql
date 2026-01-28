/*
  # Change tour_datetime and tour_end to text to preserve timezone offset

  1. Changes
    - Change `tour_datetime` from timestamp with time zone to text
    - Change `tour_end` from timestamp with time zone to text
    - This preserves the timezone offset (e.g., +01:00, +02:00) instead of normalizing to UTC

  2. Notes
    - New data will be stored as ISO strings with Brussels timezone offset
    - This allows the database to store "2026-03-18T10:00:00+01:00" instead of "2026-03-18T09:00:00+00:00"
    - Existing data will need to be migrated separately if needed
*/

-- Change column types to text
-- This will convert existing timestamps to text format
ALTER TABLE tourbooking 
  ALTER COLUMN tour_datetime TYPE text USING 
    CASE 
      WHEN tour_datetime IS NULL THEN NULL
      ELSE to_char(tour_datetime AT TIME ZONE 'Europe/Brussels', 'YYYY-MM-DD"T"HH24:MI:SS') ||
           CASE 
             WHEN EXTRACT(EPOCH FROM (tour_datetime AT TIME ZONE 'Europe/Brussels' - tour_datetime AT TIME ZONE 'UTC')) / 3600 = 2 THEN '+02:00'
             WHEN EXTRACT(EPOCH FROM (tour_datetime AT TIME ZONE 'Europe/Brussels' - tour_datetime AT TIME ZONE 'UTC')) / 3600 = 1 THEN '+01:00'
             ELSE '+01:00'
           END
    END,
  ALTER COLUMN tour_end TYPE text USING 
    CASE 
      WHEN tour_end IS NULL THEN NULL
      ELSE to_char(tour_end AT TIME ZONE 'Europe/Brussels', 'YYYY-MM-DD"T"HH24:MI:SS') ||
           CASE 
             WHEN EXTRACT(EPOCH FROM (tour_end AT TIME ZONE 'Europe/Brussels' - tour_end AT TIME ZONE 'UTC')) / 3600 = 2 THEN '+02:00'
             WHEN EXTRACT(EPOCH FROM (tour_end AT TIME ZONE 'Europe/Brussels' - tour_end AT TIME ZONE 'UTC')) / 3600 = 1 THEN '+01:00'
             ELSE '+01:00'
           END
    END;

-- Add comments
COMMENT ON COLUMN tourbooking.tour_datetime IS 'Tour start datetime as ISO string with Brussels timezone offset (e.g., "2026-03-18T10:00:00+01:00")';
COMMENT ON COLUMN tourbooking.tour_end IS 'Tour end datetime as ISO string with Brussels timezone offset (e.g., "2026-03-18T12:00:00+01:00")';
