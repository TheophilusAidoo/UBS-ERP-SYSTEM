-- Fix Admin Login Script
-- This script helps fix the admin login issue
-- 
-- The admin user exists in the users table but might not be properly set up in auth.users
-- OR the email might not be confirmed

-- Step 1: Check if user exists in auth.users
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'admin@ubs.com';

-- Step 2: If the user doesn't exist in auth.users, you need to create it manually:
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Email: admin@ubs.com
-- Password: admin@ubs1234
-- ✅ Check "Auto Confirm User" (IMPORTANT!)
-- Click "Create User"

-- Step 3: If the user exists but email_confirmed_at is NULL, update it:
-- Note: This requires admin privileges. You can also do this in Supabase Dashboard:
-- Go to Authentication > Users > Find admin@ubs.com > Click "..." > "Confirm Email"

-- Alternative: Update email confirmation directly (requires service_role key or admin access)
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'admin@ubs.com' AND email_confirmed_at IS NULL;

-- Step 4: Verify the user profile exists and is correct
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

-- Step 5: If user profile doesn't exist, create it:
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


