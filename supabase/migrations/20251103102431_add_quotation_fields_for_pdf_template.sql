/*
  # Add Missing Fields for PDF Template

  1. Changes to `quotations` table
    - Add `study_title` (text): Title of the study (e.g., "Hydratation and dark spot")
    - Add `quotation_date` (date): Date of the quotation
    - Add `customer_address` (text): Customer full address
    - Add `product_description` (text): Product testing description
    - Add `product_quantity` (int): Number of products
    - Add `number_of_volunteers` (int): Number of volunteers/panelists
    - Add `inclusion_criteria` (text): Inclusion criteria for the study
    - Add `exclusion_criteria` (text): Exclusion criteria for the study
    - Add `timepoints` (text): Timepoints description (e.g., "T0, T56")
    - Add `vat_rate` (decimal): VAT rate percentage (default 7%)

  2. Changes to `quotation_items` table
    - Add `vat_percent` (decimal): VAT percentage per item
    - Add `amount_without_tax` (decimal): Amount before VAT

  ## Notes
  - All new fields are optional to maintain backward compatibility
  - Default values are provided where appropriate
*/

-- Add new fields to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'study_title'
  ) THEN
    ALTER TABLE quotations ADD COLUMN study_title text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'quotation_date'
  ) THEN
    ALTER TABLE quotations ADD COLUMN quotation_date date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE quotations ADD COLUMN customer_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'product_description'
  ) THEN
    ALTER TABLE quotations ADD COLUMN product_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'product_quantity'
  ) THEN
    ALTER TABLE quotations ADD COLUMN product_quantity int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'number_of_volunteers'
  ) THEN
    ALTER TABLE quotations ADD COLUMN number_of_volunteers int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'inclusion_criteria'
  ) THEN
    ALTER TABLE quotations ADD COLUMN inclusion_criteria text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'exclusion_criteria'
  ) THEN
    ALTER TABLE quotations ADD COLUMN exclusion_criteria text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'timepoints'
  ) THEN
    ALTER TABLE quotations ADD COLUMN timepoints text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE quotations ADD COLUMN vat_rate decimal(5,2) DEFAULT 7.00;
  END IF;
END $$;

-- Add new fields to quotation_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'vat_percent'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN vat_percent decimal(5,2) DEFAULT 7.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'amount_without_tax'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN amount_without_tax decimal(10,2) DEFAULT 0;
  END IF;
END $$;