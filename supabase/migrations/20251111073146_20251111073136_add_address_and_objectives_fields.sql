/*
  # Add Address and Study Objectives Fields to Quotations

  1. Changes
    - Add `postal_code` field to quotations table
    - Add `city` field to quotations table
    - Add `country` field to quotations table (default 'France')
    - Add `study_objectives` field to quotations table to store study objectives as text
  
  2. Purpose
    - Enable complete address information in PDF generation
    - Store study objectives directly in quotations for PDF display
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE quotations ADD COLUMN postal_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'city'
  ) THEN
    ALTER TABLE quotations ADD COLUMN city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'country'
  ) THEN
    ALTER TABLE quotations ADD COLUMN country text DEFAULT 'France';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'study_objectives'
  ) THEN
    ALTER TABLE quotations ADD COLUMN study_objectives text DEFAULT '';
  END IF;
END $$;