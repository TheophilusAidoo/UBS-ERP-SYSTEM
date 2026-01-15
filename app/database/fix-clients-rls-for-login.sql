-- Fix Clients RLS Policies to allow clients to view their own profile during login
-- Run this in Supabase SQL Editor

-- Add policy to allow clients to view their own profile (by auth_user_id or email match)
DROP POLICY IF EXISTS "Clients can view own profile" ON clients;
CREATE POLICY "Clients can view own profile" ON clients
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)))
  );

-- Add policy to allow clients to update their own profile
DROP POLICY IF EXISTS "Clients can update own profile" ON clients;
CREATE POLICY "Clients can update own profile" ON clients
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)))
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)))
  );

-- Note: The existing policies for staff/admin are preserved
-- This adds client-specific policies that allow clients to access their own records

