/*
  # Add Service Type Field

  ## Changes
  - Add `service_type` column to services table
  - Values: 'recurring' (multiply by panelists x timepoints) or 'one_time' (synopsis, report, etc.)
  - Default to 'recurring' for backward compatibility

  ## Purpose
  This allows the system to automatically calculate quantities:
  - Recurring services (tests, measurements): quantity = panelists × timepoints
  - One-time services (synopsis, final report): quantity = 1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE services ADD COLUMN service_type text DEFAULT 'recurring';
  END IF;
END $$;