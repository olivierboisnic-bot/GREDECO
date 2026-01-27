/*
  # Add global discount to quotations

  1. Changes
    - Add `global_discount_percent` column to `quotations` table
      - Type: numeric (decimal percentage)
      - Default: 0
      - Constraint: must be between 0 and 100
    
  2. Purpose
    - Allow applying a global discount percentage to all services in a quotation
    - This discount will be combined with individual service discounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'global_discount_percent'
  ) THEN
    ALTER TABLE quotations 
    ADD COLUMN global_discount_percent numeric DEFAULT 0 CHECK (global_discount_percent >= 0 AND global_discount_percent <= 100);
  END IF;
END $$;