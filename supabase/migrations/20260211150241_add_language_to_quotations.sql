/*
  # Add Language Field to Quotations

  1. Changes
    - Add `language` column to `quotations` table
      - Type: text
      - Default: 'fr' (French)
      - Allowed values: 'fr' (French) or 'en' (English)
    - Add check constraint to ensure only valid language codes
  
  2. Purpose
    - Allow users to generate quotations in either French or English
    - Maintain backward compatibility with existing quotations (default to French)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'language'
  ) THEN
    ALTER TABLE quotations 
    ADD COLUMN language text DEFAULT 'fr' CHECK (language IN ('fr', 'en'));
  END IF;
END $$;