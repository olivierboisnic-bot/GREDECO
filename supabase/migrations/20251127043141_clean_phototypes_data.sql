/*
  # Clean Phototypes Data

  This migration cleans up the skin_types column in the quotations table by:
  1. Removing all instances of "Phototypes" or "Phototype" prefixes
  2. Keeping only the roman numerals (I, II, III, IV, V)
  3. Removing duplicates and cleaning up the formatting
  
  ## Changes
  - Updates all existing quotations with skin_types data
  - Removes "Phototype" and "Phototypes" text from values
  - Ensures only comma-separated roman numerals remain
*/

-- Clean up skin_types by removing "Phototypes" or "Phototype" text
UPDATE quotations
SET skin_types = NULLIF(
  TRIM(
    regexp_replace(
      regexp_replace(
        skin_types,
        'Phototypes?\s*',
        '',
        'gi'
      ),
      '\s*,\s*',
      ', ',
      'g'
    )
  ),
  ''
)
WHERE skin_types IS NOT NULL 
  AND skin_types != '';