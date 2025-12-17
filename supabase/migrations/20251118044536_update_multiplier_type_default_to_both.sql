/*
  # Update default value for multiplier_type to 'both'

  1. Changes
    - Change default value of multiplier_type from 'none' to 'both'
    - This ensures new services default to multiplying by panelists × timepoints
  
  2. Notes
    - Existing services with 'none' will remain unchanged
    - Only new services will have 'both' as default
*/

ALTER TABLE services ALTER COLUMN multiplier_type SET DEFAULT 'both';