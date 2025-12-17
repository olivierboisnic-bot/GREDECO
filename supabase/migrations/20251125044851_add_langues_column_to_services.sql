/*
  # Add langues column to services table

  1. Changes
    - Add `langues` column to the `services` table
    - This field will store the language information for each service
  
  2. Notes
    - Uses ALTER TABLE with IF NOT EXISTS to safely add the column
    - Default value is empty string
    - Column is nullable to support existing data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'langues'
  ) THEN
    ALTER TABLE services ADD COLUMN langues text DEFAULT '';
  END IF;
END $$;
