-- Fix Users Table RLS Policies (No Recursion)
-- Run this in Supabase SQL Editor to fix infinite recursion issue

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Create a security definer function to check if user is admin (avoids recursion)
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

-- Users Table Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Admins can view all users (using function to avoid recursion)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (is_admin());

-- Admins can insert users (using function to avoid recursion)
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (is_admin());

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admins can update users (using function to avoid recursion)
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can delete users (using function to avoid recursion)
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (is_admin());


