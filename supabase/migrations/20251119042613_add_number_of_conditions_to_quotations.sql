/*
  # Add number_of_conditions field to quotations table
  
  1. Changes
    - Add `number_of_conditions` integer field to quotations table
      - Stores the number of test conditions for ex vivo studies
      - Default value: 1
      - Used in calculation formula: (number_of_skins × number_of_conditions) × timepoints
    
  2. Notes
    - For ex vivo (laboratory) studies with services having multiplier_type='both'
    - Formula: quantity = (number_of_volunteers × number_of_conditions) × timepoints
    - Where number_of_volunteers represents number of skin samples in ex vivo context
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'number_of_conditions'
  ) THEN
    ALTER TABLE quotations ADD COLUMN number_of_conditions integer DEFAULT 1;
  END IF;
END $$;
