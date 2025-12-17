/*
  # Fix RLS policies for customers table

  1. Changes
    - Drop existing restrictive policy
    - Create new policies allowing anonymous access for all operations
    - Keep RLS enabled for security but allow anon role access
    
  2. Security
    - Allows anonymous users to perform all operations on customers table
    - Suitable for internal/admin applications without user authentication
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all access to customers" ON customers;

-- Create policies for anonymous access
CREATE POLICY "Allow anonymous select on customers"
  ON customers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on customers"
  ON customers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on customers"
  ON customers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on customers"
  ON customers
  FOR DELETE
  TO anon
  USING (true);

-- Also keep policies for authenticated users
CREATE POLICY "Allow authenticated select on customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (true);