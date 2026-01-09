-- Fix Admin Email Confirmation
-- The admin user exists but email_confirmed_at is NULL
-- This script helps fix the email confirmation issue

-- Step 1: Check current status
SELECT 
  u.id, 
  u.email, 
  u.role, 
  au.email_confirmed_at,
  au.created_at as auth_created_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin@ubs.com';

-- Step 2: Confirm the email (requires admin/service_role access)
-- Option A: Via Supabase Dashboard (EASIEST - Recommended)
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find admin@ubs.com
-- 3. Click the "..." menu (three dots)
-- 4. Click "Confirm Email"
-- 5. OR click "Edit" and check "Email Confirmed"

-- Option B: Via SQL (if you have service_role key)
-- Uncomment the line below if you have admin access:
-- UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'admin@ubs.com' AND email_confirmed_at IS NULL;

-- Step 3: If the user doesn't exist in auth.users, create it:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Email: admin@ubs.com
-- 4. Password: admin@ubs1234
-- 5. ✅ Check "Auto Confirm User" (VERY IMPORTANT!)
-- 6. Click "Create User"
-- 7. Then run the create-admin-user.sql script

-- Step 4: If password is wrong, update it:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find admin@ubs.com
-- 3. Click "..." menu > "Reset Password"
-- 4. Set new password: admin@ubs1234
-- 5. OR click "Edit" and change the password directly

-- Step 5: Verify everything is correct
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

-- Expected result: email_confirmed should be true (t)


