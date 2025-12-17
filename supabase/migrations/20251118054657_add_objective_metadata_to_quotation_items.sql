/*
  # Add objective metadata to quotation items

  1. Changes
    - Add `objective_name` column to store which objective this item belongs to
    - Add `objective_timepoints` column to store timepoints for this item
    
  2. Purpose
    - Keep service descriptions clean (only from services table)
    - Store objective/timepoint metadata separately for PDF grouping
    - Enable proper grouping without polluting description field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'objective_name'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN objective_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'objective_timepoints'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN objective_timepoints text;
  END IF;
END $$;