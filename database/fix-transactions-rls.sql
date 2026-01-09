-- Fix Transactions RLS Policies (No Recursion)
-- Run this in Supabase SQL Editor to fix infinite recursion issue

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;

-- Ensure is_admin() function exists (from fix-users-rls-no-recursion.sql)
-- If it doesn't exist, create it
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

-- Create a security definer function to check if user is staff (avoids recursion)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'staff'
  );
END;
$$;

-- Transactions Policies
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view transactions for their company (using function to avoid recursion)
CREATE POLICY "Users can view company transactions" ON transactions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Admins can view all transactions (using function to avoid recursion)
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT
  USING (is_admin());

-- Staff can create transactions for their company (using function to avoid recursion)
CREATE POLICY "Staff can create transactions" ON transactions
  FOR INSERT
  WITH CHECK (
    is_staff()
    AND user_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Admins can create transactions (using function to avoid recursion)
CREATE POLICY "Admins can create transactions" ON transactions
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update transactions (using function to avoid recursion)
CREATE POLICY "Admins can update transactions" ON transactions
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete transactions (using function to avoid recursion)
CREATE POLICY "Admins can delete transactions" ON transactions
  FOR DELETE
  USING (is_admin());


