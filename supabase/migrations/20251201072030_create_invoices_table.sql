-- Create invoices table for billing management
--
-- 1. New Tables
--    - invoices table with all invoice details
-- 
-- 2. Security
--    - Enable RLS on invoices table
--    - Add policies for authenticated users
--
-- 3. Indexes
--    - Index on quotation_id and invoice_number

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('deposit', 'final')),
  percentage numeric,
  amount_ht numeric NOT NULL DEFAULT 0,
  amount_ttc numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  payment_date date,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

-- Add invoice status columns to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'invoice_status'
  ) THEN
    ALTER TABLE quotations ADD COLUMN invoice_status text DEFAULT 'not_invoiced' CHECK (invoice_status IN ('not_invoiced', 'partially_invoiced', 'fully_invoiced'));
  END IF;
END $$;