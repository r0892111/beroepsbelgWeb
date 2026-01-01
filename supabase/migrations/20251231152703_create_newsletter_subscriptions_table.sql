/*
  # Create newsletter_subscriptions table with RLS policies

  1. Changes
    - Create newsletter_subscriptions table for storing newsletter signups
    - Add fields: email, first_name, last_name, consent_given
    - Enable RLS with policies for public insert and admin access
    - Add unique constraint on email to prevent duplicates
    - Add check constraint to ensure consent is given

  2. Notes
    - Public users can subscribe (INSERT)
    - Only authenticated admins can view, update, or delete subscriptions
    - Email must be unique
    - Consent must be true to subscribe
*/

-- Create newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text,
  last_name text,
  consent_given boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure consent is given
  CONSTRAINT check_consent CHECK (consent_given = true)
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can manage newsletter subscriptions" ON newsletter_subscriptions;

-- Allow anyone to subscribe (for public form submissions)
CREATE POLICY "Public can subscribe to newsletter"
  ON newsletter_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow admins to manage subscriptions (SELECT, UPDATE, DELETE)
CREATE POLICY "Admins can manage newsletter subscriptions"
  ON newsletter_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.isAdmin = true OR profiles.is_admin = true)
    )
  );

-- Create unique index on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);

-- Add comments for documentation
COMMENT ON TABLE newsletter_subscriptions IS 'Stores newsletter subscription signups from the footer form.';
COMMENT ON COLUMN newsletter_subscriptions.email IS 'Email address of the subscriber (unique)';
COMMENT ON COLUMN newsletter_subscriptions.first_name IS 'First name of the subscriber';
COMMENT ON COLUMN newsletter_subscriptions.last_name IS 'Last name of the subscriber';
COMMENT ON COLUMN newsletter_subscriptions.consent_given IS 'Whether the subscriber has given consent to the privacy policy (must be true)';

