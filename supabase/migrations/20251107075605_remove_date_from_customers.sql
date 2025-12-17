/*
  # Remove date column from customers table

  1. Changes
    - Remove the `date` column from the `customers` table
    
  2. Notes
    - This is a safe operation as we're only removing a column that is not critical
    - No data dependencies on this column
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'date'
  ) THEN
    ALTER TABLE customers DROP COLUMN date;
  END IF;
END $$;