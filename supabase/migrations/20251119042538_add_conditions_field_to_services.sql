/*
  # Add conditions field for ex vivo studies
  
  1. Changes
    - Add `requires_conditions` boolean field to services table
      - Indicates if service requires condition count for ex vivo studies
      - Default value: false
      - Used for services with multiplier_type 'both' in laboratory studies
    
  2. Notes
    - For ex vivo studies with multiplier_type='both':
      - Formula will be: (number_of_skins × number_of_conditions) × timepoints
    - This field helps UI determine if condition input is needed
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'requires_conditions'
  ) THEN
    ALTER TABLE services ADD COLUMN requires_conditions boolean DEFAULT false;
  END IF;
END $$;
