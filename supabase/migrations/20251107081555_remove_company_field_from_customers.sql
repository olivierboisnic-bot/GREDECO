/*
  # Remove company field from customers table

  1. Changes
    - Drop the `company` column from customers table as it's redundant
    - The `name` field represents the client/company name
    - The `contact` field represents the contact person name
    - Drop index on company field

  2. Notes
    - This cleanup removes the duplicate company field
    - name = client/société
    - contact = nom du contact
*/

DROP INDEX IF EXISTS idx_customers_company;

ALTER TABLE customers DROP COLUMN IF EXISTS company;
