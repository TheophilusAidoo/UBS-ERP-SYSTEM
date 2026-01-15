-- Fix Companies Table RLS Policies
-- Run this in Supabase SQL Editor to fix company creation for admins

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;
DROP POLICY IF EXISTS "Staff can view own company" ON companies;

-- Create a security definer function to check if user is admin (avoids recursion)
-- This function may already exist from users RLS fix, so we use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Companies Table Policies
-- Admins can view all companies (using function to avoid recursion)
CREATE POLICY "Admins can view all companies" ON companies
  FOR SELECT
  USING (is_admin());

-- Admins can insert companies (using function to avoid recursion)
CREATE POLICY "Admins can insert companies" ON companies
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update companies (using function to avoid recursion)
CREATE POLICY "Admins can update companies" ON companies
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete companies (using function to avoid recursion)
CREATE POLICY "Admins can delete companies" ON companies
  FOR DELETE
  USING (is_admin());

-- Staff can view their own company
CREATE POLICY "Staff can view own company" ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
    )
  );

