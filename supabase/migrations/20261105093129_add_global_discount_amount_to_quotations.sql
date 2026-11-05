/*
# Add fixed-amount global discount to quotations

1. Modified Tables
- `quotations`
  - `global_discount_type` (text, default 'percent', values 'percent' or 'amount'): tells whether the global discount is a percentage or a fixed euro amount.
  - `global_discount_amount` (numeric, default 0): fixed discount in euros applied to the total excluding tax when the type is 'amount'.

2. Notes
- Existing `global_discount_percent` values are kept and continue to apply as percentages (type defaults to 'percent').
- No data is removed or changed.
- Existing per-line discount values are left untouched in the database; the app will no longer apply them.
*/

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS global_discount_type text NOT NULL DEFAULT 'percent';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS global_discount_amount numeric NOT NULL DEFAULT 0;
