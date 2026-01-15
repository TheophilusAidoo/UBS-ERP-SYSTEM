-- Verify and Fix Admin User Script
-- Run this in Supabase SQL Editor to check and fix admin user setup

-- Step 1: Check if admin user exists in auth.users
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'admin@ubs.com';

-- If the query above returns no rows, the user doesn't exist in auth.users
-- You MUST create it manually in Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Email: admin@ubs.com
-- 4. Password: admin@ubs1234
-- 5. ✅ Check "Auto Confirm User" (CRITICAL!)
-- 6. Click "Create User"

-- Step 2: If user exists but email_confirmed_at is NULL, confirm the email:
-- Option A: Via Supabase Dashboard (Recommended)
-- - Go to Authentication > Users
-- - Find admin@ubs.com
-- - Click the "..." menu
-- - Click "Confirm Email"

-- Option B: Via SQL (requires admin/service_role access)
-- UPDATE auth.users 
-- SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
-- WHERE email = 'admin@ubs.com';

-- Step 3: Verify user profile exists in users table
SELECT 
  u.id, 
  u.email, 
  u.role, 
  u.first_name, 
  u.last_name,
  au.email_confirmed_at,
  au.created_at as auth_created_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin@ubs.com';

-- Step 4: If user profile doesn't exist or is incorrect, create/update it:
INSERT INTO users (id, email, role, first_name, last_name)
SELECT 
  id, 
  'admin@ubs.com', 
  'admin',
  'Admin',
  'User'
FROM auth.users 
WHERE email = 'admin@ubs.com'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin', 
  first_name = 'Admin', 
  last_name = 'User',
  email = 'admin@ubs.com';

-- Step 5: Final verification - should show both auth and profile data
SELECT 
  u.id, 
  u.email, 
  u.role, 
  u.first_name, 
  u.last_name,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at as auth_created_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin@ubs.com';


