/*
  # Setup Database Webhook for Quote Payment Checks

  This migration sets up a database webhook that can be configured in Supabase Dashboard
  to monitor quote status changes and check for payment.

  Instructions:
  1. Run this migration: supabase db push
  2. Go to Supabase Dashboard → Database → Webhooks
  3. Create a new webhook:
     - Name: "Quote Payment Check"
     - Table: tourbooking
     - Events: Update
     - Type: HTTP Request
     - URL: Your webhook endpoint (e.g., n8n webhook URL)
     - Method: POST
     - Headers: Content-Type: application/json
     - Filter: booking_type = 'B2B' AND status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid')
*/

-- Create a view for quote bookings that need payment checks
CREATE OR REPLACE VIEW quote_bookings_for_payment_check AS
SELECT 
  id,
  tour_id,
  stripe_session_id,
  status,
  booking_type,
  CASE 
    WHEN status = 'quote_paid' AND stripe_session_id IS NOT NULL THEN true
    ELSE false
  END as needs_payment_verification
FROM tourbooking
WHERE booking_type = 'B2B' 
  AND status IN ('quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid');

-- Grant access to the view
GRANT SELECT ON quote_bookings_for_payment_check TO authenticated, anon;

-- Add comment
COMMENT ON VIEW quote_bookings_for_payment_check IS 
  'View for monitoring B2B quote bookings that need payment verification. Use this view in database webhooks to check for payment status changes.';

