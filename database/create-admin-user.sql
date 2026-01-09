-- Create Admin User Script
-- This script helps create the admin user in Supabase
-- 
-- IMPORTANT: You must FIRST create the user in Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Email: admin@ubs.com
-- 4. Password: admin@ubs1234
-- 5. ✅ Check "Auto Confirm User" (IMPORTANT!)
-- 6. Click "Create User"
--
-- Then run this script to create the user profile in the users table

-- Create user profile for admin
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

-- Verify the user was created
SELECT 
  u.id, 
  u.email, 
  u.role, 
  u.first_name, 
  u.last_name,
  au.email_confirmed_at,
  au.created_at as auth_created_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin@ubs.com';


