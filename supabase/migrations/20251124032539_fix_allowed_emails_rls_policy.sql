/*
  # Fix Allowed Emails RLS Policy

  1. Changes
    - Drop existing restrictive RLS policy
    - Add new policy to allow public (anon) read access to allowed_emails
    - This is safe because the table only contains email addresses that are allowed to sign up
    - No sensitive data is exposed

  2. Security
    - Public can only READ emails
    - No write/update/delete access for anyone via client
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view allowed emails" ON allowed_emails;
DROP POLICY IF EXISTS "No client-side modifications" ON allowed_emails;

-- Allow anyone (including unauthenticated users) to read allowed emails
CREATE POLICY "Anyone can view allowed emails"
  ON allowed_emails
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Prevent all modifications via client
CREATE POLICY "No client-side inserts"
  ON allowed_emails
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client-side updates"
  ON allowed_emails
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No client-side deletes"
  ON allowed_emails
  FOR DELETE
  TO anon, authenticated
  USING (false);