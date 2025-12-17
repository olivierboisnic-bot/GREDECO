/*
  # Create Services and Quotations System

  ## New Tables
  
  ### services
  - `id` (uuid, primary key): Unique identifier
  - `name` (text): Service or equipment name
  - `description` (text): Service description including TVA info
  - `base_price` (decimal): Unit price
  - `unit` (text): Unit of measurement (default: 'unit')
  - `category` (text): Service category (clinique, appareil, general, etc.)
  - `is_active` (boolean): Whether service is active
  - `created_at` (timestamptz): Creation timestamp
  - `updated_at` (timestamptz): Last update timestamp

  ### quotations
  - `id` (uuid, primary key): Unique identifier
  - `quotation_number` (text, unique): Quotation reference number
  - `customer_name` (text): Customer name
  - `customer_email` (text): Customer email
  - `customer_company` (text): Customer company name
  - `status` (text): Quotation status (draft, sent, accepted, rejected)
  - `valid_until` (date): Expiration date
  - `notes` (text): Additional notes
  - `total_amount` (decimal): Total quotation amount
  - `created_at` (timestamptz): Creation timestamp
  - `updated_at` (timestamptz): Last update timestamp

  ### quotation_items
  - `id` (uuid, primary key): Unique identifier
  - `quotation_id` (uuid, foreign key): Reference to quotation
  - `service_id` (uuid, foreign key): Reference to service
  - `service_name` (text): Service name snapshot
  - `description` (text): Item description
  - `quantity` (decimal): Quantity
  - `unit_price` (decimal): Unit price
  - `discount_percent` (decimal): Discount percentage
  - `subtotal` (decimal): Line item subtotal
  - `created_at` (timestamptz): Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for public access (no authentication required)
  
  ## Indexes
  - Index on quotation_items.quotation_id for faster lookups
  - Index on services.category for filtering
  - Index on quotations.status for filtering
  - Index on quotations.created_at for sorting
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  base_price decimal(10,2) NOT NULL DEFAULT 0,
  unit text DEFAULT 'unit',
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_company text DEFAULT '',
  status text DEFAULT 'draft',
  valid_until date DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  notes text DEFAULT '',
  total_amount decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  service_name text NOT NULL,
  description text DEFAULT '',
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can manage services" ON services;
CREATE POLICY "Public can manage services"
  ON services FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view quotations" ON quotations;
CREATE POLICY "Public can view quotations"
  ON quotations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can create quotations" ON quotations;
CREATE POLICY "Public can create quotations"
  ON quotations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update quotations" ON quotations;
CREATE POLICY "Public can update quotations"
  ON quotations FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete quotations" ON quotations;
CREATE POLICY "Public can delete quotations"
  ON quotations FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Public can view quotation items" ON quotation_items;
CREATE POLICY "Public can view quotation items"
  ON quotation_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can create quotation items" ON quotation_items;
CREATE POLICY "Public can create quotation items"
  ON quotation_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update quotation items" ON quotation_items;
CREATE POLICY "Public can update quotation items"
  ON quotation_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete quotation items" ON quotation_items;
CREATE POLICY "Public can delete quotation items"
  ON quotation_items FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);