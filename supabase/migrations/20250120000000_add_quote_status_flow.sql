/*
  # Add Quote Status Flow for B2B Bookings

  1. New Status Values
    - Add quote-specific statuses to track B2B quote offers separately
    - Status flow: quote_pending → quote_sent → quote_accepted → quote_paid → confirmed

  2. Database Webhook Setup
    - Create webhook function to check for payment when quote status changes
    - Set up trigger to call webhook on status updates for B2B bookings

  3. Notes
    - Quote offers (B2B bookings) will use separate status flow
    - Database webhook can monitor status changes for payment processing
*/

-- Add new quote-specific statuses (if not already in use)
-- Note: PostgreSQL doesn't enforce enum constraints on text columns,
-- but we'll document the expected status flow

-- Create a function to handle quote status webhook
CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text;
  payload jsonb;
BEGIN
  -- Only trigger for B2B bookings with quote statuses
  IF NEW.booking_type = 'B2B' AND 
     (NEW.status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid') OR
      OLD.status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid')) THEN
    
    -- Build payload with booking details
    payload := jsonb_build_object(
      'event', 'quote_status_change',
      'booking_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'booking_type', NEW.booking_type,
      'stripe_session_id', NEW.stripe_session_id,
      'tour_id', NEW.tour_id
    );
    
    -- Get webhook URL from environment (set via Supabase Dashboard)
    -- This will be configured in the Database Webhook settings
    -- For now, we'll use pg_notify which can be picked up by Supabase webhooks
    
    PERFORM pg_notify('quote_status_change', payload::text);
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call webhook function on status updates
DROP TRIGGER IF EXISTS quote_status_change_trigger ON tourbooking;
CREATE TRIGGER quote_status_change_trigger
  AFTER UPDATE OF status ON tourbooking
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION notify_quote_status_change();

-- Add index for quote status queries
CREATE INDEX IF NOT EXISTS idx_tourbooking_quote_status 
  ON tourbooking(booking_type, status) 
  WHERE booking_type = 'B2B' AND status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid');

-- Add comment documenting the quote status flow
COMMENT ON COLUMN tourbooking.status IS 
  'Booking status. B2C: pending → payment_completed → confirmed → completed. B2B Quote: quote_pending → quote_sent → quote_accepted → quote_paid → confirmed → completed.';

