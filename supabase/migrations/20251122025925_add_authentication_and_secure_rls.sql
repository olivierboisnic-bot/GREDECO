/*
  # Add Authentication and Secure RLS Policies

  ## Overview
  This migration secures the application by:
  1. Removing public access policies that allowed anyone to modify data
  2. Implementing authentication-based Row Level Security (RLS)
  3. Ensuring only authenticated users can access and manage data

  ## Security Changes

  ### Services Table
  - Authenticated users can view all services
  - Authenticated users can create/update/delete services

  ### Quotations Table
  - Authenticated users can view all quotations
  - Authenticated users can create/update/delete quotations

  ### Quotation Items Table
  - Authenticated users can view all quotation items
  - Authenticated users can create/update/delete quotation items

  ### Customers Table
  - Authenticated users can view all customers
  - Authenticated users can create/update/delete customers

  ### Study Objectives Table
  - Authenticated users can view all study objectives
  - Authenticated users can create/update/delete study objectives

  ## Important Notes
  - All tables now require authentication
  - Anonymous users (not logged in) will have NO ACCESS to any data
  - You must be logged in to use the application
  - Use Supabase Auth for user management
*/

-- ============================================================================
-- SERVICES TABLE - Secure Policies
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage services" ON services;

CREATE POLICY "Authenticated users can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- QUOTATIONS TABLE - Secure Policies
-- ============================================================================

DROP POLICY IF EXISTS "Public can view quotations" ON quotations;
DROP POLICY IF EXISTS "Public can create quotations" ON quotations;
DROP POLICY IF EXISTS "Public can update quotations" ON quotations;
DROP POLICY IF EXISTS "Public can delete quotations" ON quotations;

CREATE POLICY "Authenticated users can view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quotations"
  ON quotations FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- QUOTATION_ITEMS TABLE - Secure Policies
-- ============================================================================

DROP POLICY IF EXISTS "Public can view quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Public can create quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Public can update quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Public can delete quotation items" ON quotation_items;

CREATE POLICY "Authenticated users can view quotation items"
  ON quotation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert quotation items"
  ON quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotation items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quotation items"
  ON quotation_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- CUSTOMERS TABLE - Secure Policies
-- ============================================================================

DROP POLICY IF EXISTS "Public can manage customers" ON customers;
DROP POLICY IF EXISTS "Public can view customers" ON customers;
DROP POLICY IF EXISTS "Public can create customers" ON customers;
DROP POLICY IF EXISTS "Public can update customers" ON customers;
DROP POLICY IF EXISTS "Public can delete customers" ON customers;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STUDY_OBJECTIVES TABLE - Secure Policies (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'study_objectives') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can manage study objectives" ON study_objectives';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view study objectives" ON study_objectives';
    EXECUTE 'DROP POLICY IF EXISTS "Public can create study objectives" ON study_objectives';
    EXECUTE 'DROP POLICY IF EXISTS "Public can update study objectives" ON study_objectives';
    EXECUTE 'DROP POLICY IF EXISTS "Public can delete study objectives" ON study_objectives';

    EXECUTE 'CREATE POLICY "Authenticated users can view study objectives"
      ON study_objectives FOR SELECT
      TO authenticated
      USING (true)';

    EXECUTE 'CREATE POLICY "Authenticated users can insert study objectives"
      ON study_objectives FOR INSERT
      TO authenticated
      WITH CHECK (true)';

    EXECUTE 'CREATE POLICY "Authenticated users can update study objectives"
      ON study_objectives FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)';

    EXECUTE 'CREATE POLICY "Authenticated users can delete study objectives"
      ON study_objectives FOR DELETE
      TO authenticated
      USING (true)';
  END IF;
END $$;
