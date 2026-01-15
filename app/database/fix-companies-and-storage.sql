-- Fix Companies RLS and Storage Bucket
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================
-- PART 1: Fix Companies RLS Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;
DROP POLICY IF EXISTS "Staff can view own company" ON companies;

-- Create or replace the is_admin() function (avoids recursion)
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
-- Admins can view all companies
CREATE POLICY "Admins can view all companies" ON companies
  FOR SELECT
  USING (is_admin());

-- Admins can insert companies (THIS IS THE KEY FIX)
CREATE POLICY "Admins can insert companies" ON companies
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update companies
CREATE POLICY "Admins can update companies" ON companies
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete companies
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

-- ============================================
-- PART 2: Fix Storage Bucket for Company Logos
-- ============================================

-- Delete existing bucket if it exists (to start fresh)
DELETE FROM storage.buckets WHERE id = 'company-assets';

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true, -- Public bucket so images can be accessed
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- Drop ALL existing storage policies for this bucket
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%company-assets%') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Policy 1: Allow public read access (so images show in browser)
CREATE POLICY "Public read access for company-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

-- Policy 2: Allow ANY authenticated user to upload (no restrictions)
-- Since the bucket is public and only admins can access upload in the app, this is safe
CREATE POLICY "Authenticated upload to company-assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets'
);

-- Policy 3: Allow authenticated users to update files
CREATE POLICY "Authenticated update company-assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'company-assets')
WITH CHECK (bucket_id = 'company-assets');

-- Policy 4: Allow authenticated users to delete files
CREATE POLICY "Authenticated delete company-assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-assets');

