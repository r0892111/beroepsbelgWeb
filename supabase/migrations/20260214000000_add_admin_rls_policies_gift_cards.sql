/*
  # Add Admin RLS Policies for Gift Cards

  1. Changes
    - Add policy for admins to insert gift cards
    - Add policy for admins to update gift cards
    - Add policy for admins to delete gift cards
    - Add policy for admins to insert gift card transactions

  2. Notes
    - Admin check is done via profiles.isAdmin = true OR profiles.is_admin = true
    - These policies allow the admin panel to manage gift cards
*/

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can insert gift cards" ON gift_cards;
DROP POLICY IF EXISTS "Admins can update gift cards" ON gift_cards;
DROP POLICY IF EXISTS "Admins can delete gift cards" ON gift_cards;
DROP POLICY IF EXISTS "Admins can insert gift card transactions" ON gift_card_transactions;

-- Policy: Admins can insert gift cards
CREATE POLICY "Admins can insert gift cards"
  ON gift_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can update gift cards
CREATE POLICY "Admins can update gift cards"
  ON gift_cards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can delete gift cards
CREATE POLICY "Admins can delete gift cards"
  ON gift_cards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );

-- Policy: Admins can insert gift card transactions
CREATE POLICY "Admins can insert gift card transactions"
  ON gift_card_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles."isAdmin" = true OR profiles."is_admin" = true)
    )
  );
