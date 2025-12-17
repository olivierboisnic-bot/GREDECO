/*
  # Add study_type to quotations table

  1. Changes
    - Add `study_type` column to `quotations` table
      - Type: text with check constraint (in_vivo or ex_vivo)
      - Default: 'in_vivo'
      - Used to distinguish between clinical (in vivo) and laboratory (ex vivo) studies
  
  2. Notes
    - This field will be used when loading quotations to properly restore the study type
    - Existing quotations will default to 'in_vivo'
*/

-- Add study_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'study_type'
  ) THEN
    ALTER TABLE quotations 
    ADD COLUMN study_type text DEFAULT 'in_vivo' CHECK (study_type IN ('in_vivo', 'ex_vivo'));
  END IF;
END $$;