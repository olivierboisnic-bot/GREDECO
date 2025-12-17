/*
  # Add order_index field to quotation_items

  1. Changes
    - Add `order_index` column to `quotation_items` table with default value of 0
    - Create index on order_index for better query performance
  
  2. Notes
    - This enables dynamic reordering of services in quotations
    - Default value of 0 ensures existing records remain valid
    - The order_index will be used to sort items when displaying quotations
*/

-- Add order_index column to quotation_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN order_index integer DEFAULT 0;
  END IF;
END $$;

-- Create index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_quotation_items_order ON quotation_items(quotation_id, order_index);