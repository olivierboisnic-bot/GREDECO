/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses security and performance recommendations from Supabase.

  ## Changes

  ### 1. Database Performance
  - Confirms that all foreign key indexes are properly in place:
    - `idx_quotation_items_quotation_id` covers `quotation_items_quotation_id_fkey`
    - `idx_quotation_items_service_id` covers `quotation_items_service_id_fkey`
  
  ### 2. Unused Indexes
  - Removed unused indexes that were reported:
    - `idx_quotations_status` (if exists) - not being used by queries
    - `idx_customers_company` (if exists) - not being used by queries

  ### 3. Security Notes
  - Leaked password protection should be enabled via Supabase Dashboard:
    - Navigate to Authentication → Settings → Password Protection
    - Enable "Check for breached passwords" using HaveIBeenPwned API
    - This cannot be set via SQL migration and must be configured in the dashboard

  ## Important Notes
  - All existing foreign key constraints already have covering indexes
  - Only removes truly unused indexes to improve write performance
  - Password breach detection must be enabled manually in dashboard
*/

-- Drop unused indexes if they exist
-- These indexes were reported as unused by Supabase performance monitoring

DROP INDEX IF EXISTS idx_quotations_status;
DROP INDEX IF EXISTS idx_customers_company;

-- Verify that all foreign key indexes are present
-- (These should already exist from previous migrations)

-- Index for quotation_items.quotation_id foreign key
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id 
  ON quotation_items(quotation_id);

-- Index for quotation_items.service_id foreign key  
CREATE INDEX IF NOT EXISTS idx_quotation_items_service_id 
  ON quotation_items(service_id);

-- Add comment for documentation
COMMENT ON INDEX idx_quotation_items_quotation_id IS 'Covers foreign key quotation_items_quotation_id_fkey for optimal JOIN performance';
COMMENT ON INDEX idx_quotation_items_service_id IS 'Covers foreign key quotation_items_service_id_fkey for optimal JOIN performance';
