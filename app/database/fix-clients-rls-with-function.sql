-- Fix Clients RLS Policies with Helper Function (More Reliable)
-- Run this in Supabase SQL Editor

-- Create helper function to get current user email from auth
CREATE OR REPLACE FUNCTION get_auth_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
END;
$$;

-- Add policy to allow clients to view their own profile (by auth_user_id or email match)
DROP POLICY IF EXISTS "Clients can view own profile" ON clients;
CREATE POLICY "Clients can view own profile" ON clients
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR LOWER(TRIM(email)) = LOWER(TRIM(get_auth_user_email()))
  );

-- Add policy to allow clients to update their own profile
DROP POLICY IF EXISTS "Clients can update own profile" ON clients;
CREATE POLICY "Clients can update own profile" ON clients
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR LOWER(TRIM(email)) = LOWER(TRIM(get_auth_user_email()))
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR LOWER(TRIM(email)) = LOWER(TRIM(get_auth_user_email()))
  );

-- Note: The existing policies for staff/admin are preserved
-- This adds client-specific policies that allow clients to access their own records
