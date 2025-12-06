/*
  # Add Aftercare Tracking to Tour Booking Table

  1. Changes
    - Add `aftercare_sent_at` column to track when aftercare was sent
    - NULL means aftercare hasn't been sent yet

  2. Notes
    - Used by the aftercare-start cron job to avoid sending duplicate aftercare
*/

ALTER TABLE tourbooking ADD COLUMN IF NOT EXISTS aftercare_sent_at timestamptz;

-- Create index for faster cron job queries
CREATE INDEX IF NOT EXISTS idx_tourbooking_aftercare_sent_at ON tourbooking(aftercare_sent_at);





