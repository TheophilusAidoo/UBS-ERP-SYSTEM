-- Check and Create Admin User - Complete Script
-- Run this step by step

-- Step 1: Check if user exists in auth.users
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'admin@ubs.com';

-- If the query above returns NO ROWS, you need to create the user in Supabase Dashboard first:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Email: admin@ubs.com
-- 4. Password: admin@ubs1234
-- 5. ✅ Check "Auto Confirm User"
-- 6. Click "Create User"
-- 7. Then come back and run Step 2 below

-- Step 2: Create user profile in users table (ONLY run this AFTER creating user in Dashboard)
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

-- Step 3: Verify everything is set up correctly
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

-- Expected result: Should return 1 row with email_confirmed = true


