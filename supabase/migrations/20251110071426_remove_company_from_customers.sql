/*
  # Remove company column from customers table

  1. Changes
    - Remove `company` column from `customers` table
    - The company name is now stored in the `name` field
  
  2. Notes
    - This column is no longer needed as name represents the company name
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'company'
  ) THEN
    ALTER TABLE customers DROP COLUMN company;
  END IF;
END $$;