-- Create Helper Functions for RLS Policies
-- Run this FIRST before running update-rls-company-isolation.sql
-- Run this in Supabase Dashboard → SQL Editor

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT company_id INTO result FROM users WHERE id = auth.uid() LIMIT 1;
  RETURN result;
END;
$$;

-- Verify functions were created
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('is_admin', 'user_company_id')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
