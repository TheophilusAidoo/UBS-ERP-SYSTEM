-- Confirm Admin Email - Direct SQL Fix
-- This script directly confirms the admin email in auth.users
-- 
-- IMPORTANT: This requires service_role access or admin privileges
-- If this doesn't work, use the Supabase Dashboard method below

-- Method 1: Direct SQL Update (if you have service_role key)
-- Note: confirmed_at is a generated column, so we only update email_confirmed_at
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'admin@ubs.com' 
  AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  confirmed_at IS NOT NULL as confirmed,
  created_at
FROM auth.users 
WHERE email = 'admin@ubs.com';

-- Expected result: email_confirmed and confirmed should both be true (t)

-- ============================================
-- ALTERNATIVE METHOD: Via Supabase Dashboard
-- ============================================
-- If the SQL above doesn't work (permissions issue), use this:
--
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Find the user: admin@ubs.com
-- 4. Click the "..." menu (three dots) on the right
-- 5. Click "Confirm Email"
--
-- OR
--
-- 1. Click "Edit" on the user
-- 2. Check the "Email Confirmed" checkbox
-- 3. Click "Save"
--
-- ============================================
-- IF USER DOESN'T EXIST IN auth.users:
-- ============================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Email: admin@ubs.com
-- 4. Password: admin@ubs1234
-- 5. ✅ Check "Auto Confirm User" (CRITICAL!)
-- 6. Click "Create User"
-- 7. Then run: database/create-admin-user.sql

