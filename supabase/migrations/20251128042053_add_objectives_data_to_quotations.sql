/*
  # Add objectives_data column to quotations table

  1. Changes
    - Add `objectives_data` JSONB column to quotations table to store complete objective definitions
    - This will store the array of objectives with their names, timepoints, and service selections
    - Allows proper reconstruction of objective-level timepoint display in preview and PDF

  2. Notes
    - The column is nullable to maintain compatibility with existing quotations
    - New quotations will store the complete objectives array as JSON
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'objectives_data'
  ) THEN
    ALTER TABLE quotations ADD COLUMN objectives_data jsonb DEFAULT NULL;
  END IF;
END $$;
