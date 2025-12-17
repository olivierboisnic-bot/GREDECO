/*
  # Remove Claims Column from Services

  1. Changes
    - Drop the `claims` column from `services` table as it's no longer needed
  
  2. Notes
    - This is a safe operation as claims data is no longer required
*/

ALTER TABLE services DROP COLUMN IF EXISTS claims;
