/*
  # Add multiplier type to services table

  1. Changes
    - Add `multiplier_type` column to services table to handle:
      - 'none': No multiplication (default)
      - 'panelists': Multiply by number of panelists
      - 'timepoints': Multiply by number of timepoints
      - 'both': Multiply by panelists × timepoints
    
  2. Notes
    - This allows services like "Recrutement de panélistes" to be automatically multiplied
    - Simplifies the pricing logic for clinical studies
    - Can be set via Excel import or manual entry
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'multiplier_type'
  ) THEN
    ALTER TABLE services ADD COLUMN multiplier_type text DEFAULT 'none';
  END IF;
END $$;