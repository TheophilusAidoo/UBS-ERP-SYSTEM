-- Fix Leave Requests RLS Policies (No Recursion)
-- Run this in Supabase SQL Editor to fix infinite recursion issue

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Staff can create leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;

-- Create a security definer function to check if user is admin (avoids recursion)
-- This function should already exist from fix-users-rls-no-recursion.sql
-- If not, it will be created here
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

-- Leave Requests Policies
-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests" ON leave_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all leave requests (using function to avoid recursion)
CREATE POLICY "Admins can view all leave requests" ON leave_requests
  FOR SELECT
  USING (is_admin());

-- Staff can create their own leave requests (using function to avoid recursion)
CREATE POLICY "Staff can create leave requests" ON leave_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND is_staff()
  );

-- Admins can update leave requests (using function to avoid recursion)
CREATE POLICY "Admins can update leave requests" ON leave_requests
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());


