-- Quick Test Users Setup Script
-- Run this in Supabase SQL Editor after creating users in Authentication

-- Step 1: Create a test company (if it doesn't exist)
INSERT INTO companies (name, email, is_active)
VALUES ('UBS Test Company', 'test@ubs.com', true)
ON CONFLICT DO NOTHING;

-- Step 2: After creating auth users in Supabase Dashboard (Authentication > Users),
-- run these queries to create user profiles:

-- IMPORTANT: First create the users in Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Create admin@ubs.com with password: test123
-- 4. Create staff@ubs.com with password: test123
-- 5. Make sure "Auto Confirm User" is checked for both

-- For Admin User
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
SET role = 'admin', first_name = 'Admin', last_name = 'User';

-- For Staff User
INSERT INTO users (id, email, role, company_id, first_name, last_name, job_title)
SELECT 
  id, 
  'staff@ubs.com', 
  'staff',
  (SELECT id FROM companies WHERE name = 'UBS Test Company' LIMIT 1),
  'Staff',
  'User',
  'Developer'
FROM auth.users 
WHERE email = 'staff@ubs.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'staff', 
    company_id = (SELECT id FROM companies WHERE name = 'UBS Test Company' LIMIT 1),
    first_name = 'Staff', 
    last_name = 'User',
    job_title = 'Developer';

-- Verify users were created
SELECT u.id, u.email, u.role, u.first_name, u.last_name, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email IN ('admin@ubs.com', 'staff@ubs.com');

