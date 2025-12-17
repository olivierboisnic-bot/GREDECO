-- Create customers table
-- 
-- 1. New Tables
--    - customers table with client information
--
-- 2. Security
--    - Enable RLS
--    - Add policies for public access (no authentication required)
--
-- 3. Indexes
--    - Index on email and name for faster lookups

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  position text DEFAULT '',
  study_type text DEFAULT '',
  date date DEFAULT CURRENT_DATE,
  address text DEFAULT '',
  postal_code text DEFAULT '',
  city text DEFAULT '',
  country text DEFAULT '',
  company text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customers"
  ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);