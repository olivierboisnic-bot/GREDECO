/*
  # Add TVA and Mandatory Type Fields to Services Table

  1. Changes
    - Add `tva_rate` column to `services` table (numeric, default 20)
    - Add `mandatory_type` column to indicate service requirement level:
      * 'none' - Optional service (default)
      * 'all_studies' - Mandatory for all studies (e.g., Study Management, Final Report)
      * 'clinical_trials' - Mandatory for clinical trials/in vivo studies
      * 'laboratory' - Mandatory for laboratory studies
      * 'recurring' - Recurring service (not mandatory but applies per panelist/timepoint)
    
  2. Notes
    - TVA rate is stored as a percentage (e.g., 20 for 20%)
    - Mandatory type helps automate quotation generation
    - Existing services will have default values (tva_rate=20, mandatory_type='none')
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'tva_rate'
  ) THEN
    ALTER TABLE services ADD COLUMN tva_rate numeric DEFAULT 20;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'mandatory_type'
  ) THEN
    ALTER TABLE services ADD COLUMN mandatory_type text DEFAULT 'none';
  END IF;
END $$;