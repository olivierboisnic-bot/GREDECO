/*
  # Add Allowed Emails Table

  1. New Tables
    - `allowed_emails`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Email addresses allowed to sign up
      - `name` (text) - Optional name for the user
      - `created_at` (timestamptz) - When the email was added
      - `created_by` (uuid) - Admin who added this email (nullable)

  2. Security
    - Enable RLS on `allowed_emails` table
    - Only authenticated users can read allowed emails
    - No one can insert/update/delete via client (admin-only via backend)

  3. Initial Data
    - Add Sylvie's email as an allowed email
*/

CREATE TABLE IF NOT EXISTS allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view allowed emails"
  ON allowed_emails
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "No client-side modifications"
  ON allowed_emails
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Insert Sylvie's email
INSERT INTO allowed_emails (email, name) 
VALUES ('sylvie.boisnic@gredeco.com', 'Sylvie Boisnic')
ON CONFLICT (email) DO NOTHING;