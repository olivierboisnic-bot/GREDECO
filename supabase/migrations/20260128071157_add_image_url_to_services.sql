/*
  # Add image_url field to services table

  1. Changes
    - Add `image_url` column to `services` table to store service images
    - This field is optional (nullable) to maintain backward compatibility
    - Images will be displayed in quotations and PDFs under each service

  2. Notes
    - Images can be stored as URLs (e.g., Supabase Storage URLs, external URLs)
    - Existing services will have NULL image_url by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE services ADD COLUMN image_url text;
  END IF;
END $$;
