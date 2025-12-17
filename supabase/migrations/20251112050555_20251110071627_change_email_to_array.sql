/*
  # Change email field to support multiple emails

  1. Changes
    - Change `email` column from text to jsonb to support multiple emails
    - Migrate existing single email values to array format
  
  2. Details
    - Stores emails as JSON array: ["email1@example.com", "email2@example.com"]
    - Allows up to 4 emails per customer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'emails'
  ) THEN
    ALTER TABLE customers ADD COLUMN emails jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  UPDATE customers 
  SET emails = CASE 
    WHEN email IS NOT NULL AND email != '' THEN jsonb_build_array(email)
    ELSE '[]'::jsonb
  END
  WHERE emails = '[]'::jsonb;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'email'
  ) THEN
    ALTER TABLE customers DROP COLUMN email;
  END IF;
END $$;