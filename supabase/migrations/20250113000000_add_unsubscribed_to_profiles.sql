/*
  # Add unsubscribed column to profiles

  1. Changes
    - Add `unsubscribed` boolean column to profiles table
    - Default to false (subscribed)

  2. Notes
    - Used by n8n abandoned cart workflow to skip unsubscribed users
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;
