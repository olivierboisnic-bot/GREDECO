/*
  # Add image_url field to quotation_items table

  1. Changes
    - Add `image_url` column to `quotation_items` table
    - This field stores the service image URL at the time of quotation creation
    - Images will be displayed in quotations and PDFs

  2. Notes
    - Existing quotation items will have NULL image_url
    - New items will copy the image_url from the service if available
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN image_url text;
  END IF;
END $$;
