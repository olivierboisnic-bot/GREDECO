/*
  # Add skin_types field to quotations table

  1. Changes
    - Add `skin_types` column to `quotations` table to store Fitzpatrick phototypes
    - Field will store comma-separated list of skin types (e.g., "Phototypes I, II, III, IV")
  
  2. Notes
    - This field is optional and will only be shown in PDF if populated
    - Used for in vivo studies to specify target phototypes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'quotations'
    AND column_name = 'skin_types'
  ) THEN
    ALTER TABLE quotations ADD COLUMN skin_types text DEFAULT '';
  END IF;
END $$;