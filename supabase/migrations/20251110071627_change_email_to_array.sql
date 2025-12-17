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
  ALTER TABLE customers ADD COLUMN emails jsonb DEFAULT '[]'::jsonb;
  
  UPDATE customers 
  SET emails = CASE 
    WHEN email IS NOT NULL AND email != '' THEN jsonb_build_array(email)
    ELSE '[]'::jsonb
  END;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'email'
  ) THEN
    ALTER TABLE customers DROP COLUMN email;
  END IF;
END $$;