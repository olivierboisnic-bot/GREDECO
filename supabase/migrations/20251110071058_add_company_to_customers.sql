/*
  # Add company column to customers table

  1. Changes
    - Add `company` column to `customers` table to store customer company name
  
  2. Details
    - Column type: text
    - Nullable: yes (optional field)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'company'
  ) THEN
    ALTER TABLE customers ADD COLUMN company text;
  END IF;
END $$;