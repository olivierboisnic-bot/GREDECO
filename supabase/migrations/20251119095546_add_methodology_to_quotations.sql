/*
  # Add methodology field to quotations

  1. Changes
    - Add `methodology` column to `quotations` table
      - Type: text
      - Nullable: true
      - Description: Stores the study methodology/design description
  
  2. Notes
    - This field will be displayed in the "Design de l'Étude" section
    - Used to describe the research methodology approach
*/

-- Add methodology column to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'methodology'
  ) THEN
    ALTER TABLE quotations ADD COLUMN methodology text;
  END IF;
END $$;