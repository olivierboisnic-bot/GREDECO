/*
  # Add Unified Type Field to Services

  1. Changes
    - Add new `type` column to replace `service_type`
    - Type values:
      * 'optional' - Optional service (default)
      * 'mandatory_all' - Mandatory for all studies
      * 'mandatory_clinical' - Mandatory for clinical trials/in vivo
      * 'mandatory_lab' - Mandatory for laboratory studies
      * 'recurring' - Recurring service (multiplied by panelists × timepoints)
      * 'one_time' - One-time service (multiplied by panelists only)
    
  2. Notes
    - Migrates existing service_type data
    - Removes old service_type column
*/

-- Add the new type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'type'
  ) THEN
    ALTER TABLE services ADD COLUMN type text DEFAULT 'optional';
  END IF;
END $$;

-- Migrate existing data from service_type
UPDATE services
SET type = CASE
  WHEN service_type = 'recurring' THEN 'recurring'
  WHEN service_type = 'one_time' THEN 'one_time'
  ELSE 'optional'
END
WHERE type = 'optional' AND service_type IS NOT NULL;

-- Drop old service_type column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE services DROP COLUMN service_type;
  END IF;
END $$;