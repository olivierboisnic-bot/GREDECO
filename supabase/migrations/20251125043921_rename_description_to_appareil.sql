/*
  # Rename description column to appareil in services table

  1. Changes
    - Rename the `description` column to `appareil` in the `services` table
    - This better reflects that the field stores equipment/apparatus information
  
  2. Notes
    - Uses ALTER TABLE with IF EXISTS to safely rename the column
    - All existing data is preserved
    - No data type changes
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'description'
  ) THEN
    ALTER TABLE services RENAME COLUMN description TO appareil;
  END IF;
END $$;
