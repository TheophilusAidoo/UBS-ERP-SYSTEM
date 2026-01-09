-- Fix Users Table RLS Policies
-- Run this in Supabase SQL Editor to fix admin user creation

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Users Table Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can insert users (this is the key fix - allows admin to create new users)
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Allow users to insert their own profile during registration (for self-registration)
-- This is needed for the initial admin user creation
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admins can update users
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );


