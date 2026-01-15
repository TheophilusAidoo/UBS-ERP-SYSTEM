# Test Users Guide

## Quick Start - Creating Test Users

### Option 1: Using the App Registration Screen (Recommended)

1. **Start the app**: `npm start`
2. **Open the app** in Expo Go or your simulator
3. **Click "Don't have an account? Register"** on the login screen
4. **Register as Admin**:
   - Select "Admin" role
   - Fill in: First Name, Last Name, Email, Password
   - Click Register
   - You'll be automatically logged in as Admin

5. **Register as Staff**:
   - First, create a company (as Admin) or use Supabase dashboard
   - Logout and register as "Staff"
   - Fill in all fields including Job Title
   - Note: Staff registration works, but company assignment may need to be done by Admin

### Option 2: Using Supabase Dashboard (For Quick Testing)

#### Create Admin User:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add User"** or **"Invite User"**
4. Enter:
   - Email: `admin@ubs.com`
   - Password: `admin123` (or your choice)
   - Auto Confirm: ✅ (check this to skip email verification)
5. Click **"Create User"**

6. Go to **Table Editor > users**
7. Click **"Insert Row"** or use SQL Editor:
   ```sql
   INSERT INTO users (id, email, role, first_name, last_name)
   SELECT 
     id, 
     'admin@ubs.com', 
     'admin',
     'Admin',
     'User'
   FROM auth.users 
   WHERE email = 'admin@ubs.com';
   ```

#### Create Staff User:

1. **First, create a company** (if you don't have one):
   ```sql
   INSERT INTO companies (name, email, is_active)
   VALUES ('Test Company', 'company@test.com', true);
   ```

2. **Create staff user in Authentication**:
   - Go to Authentication > Users > Add User
   - Email: `staff@ubs.com`
   - Password: `staff123`
   - Auto Confirm: ✅

3. **Create staff profile**:
   ```sql
   INSERT INTO users (id, email, role, company_id, first_name, last_name, job_title)
   SELECT 
     id, 
     'staff@ubs.com', 
     'staff',
     (SELECT id FROM companies LIMIT 1),
     'Staff',
     'User',
     'Developer'
   FROM auth.users 
   WHERE email = 'staff@ubs.com';
   ```

### Option 3: Quick SQL Script (Copy & Paste)

Run this in Supabase SQL Editor to create test users quickly:

```sql
-- Create a test company
INSERT INTO companies (name, email, is_active)
VALUES ('UBS Test Company', 'test@ubs.com', true)
ON CONFLICT DO NOTHING;

-- Get the company ID (replace with actual ID from companies table)
-- Let's assume company ID is needed, so we'll use a subquery

-- Create Admin User (replace email/password as needed)
-- First create auth user manually in Supabase Dashboard, then run:
-- 
-- INSERT INTO users (id, email, role, first_name, last_name)
-- SELECT id, 'admin@test.com', 'admin', 'Admin', 'User'
-- FROM auth.users WHERE email = 'admin@test.com'
-- ON CONFLICT (id) DO NOTHING;

-- Create Staff User
-- First create auth user manually, then:
--
-- INSERT INTO users (id, email, role, company_id, first_name, last_name, job_title)
-- SELECT 
--   id, 
--   'staff@test.com', 
--   'staff',
--   (SELECT id FROM companies WHERE name = 'UBS Test Company' LIMIT 1),
--   'Staff',
--   'User',
--   'Developer'
-- FROM auth.users WHERE email = 'staff@test.com'
-- ON CONFLICT (id) DO NOTHING;
```

## Test Credentials (After Setup)

### Admin Account
- **Email**: `admin@ubs.com` (or what you created)
- **Password**: `admin123` (or what you set)
- **Access**: Full admin dashboard with all features

### Staff Account
- **Email**: `staff@ubs.com` (or what you created)
- **Password**: `staff123` (or what you set)
- **Access**: Staff dashboard with limited features

## Troubleshooting

### "User not found" error
- Make sure you created the user in both `auth.users` (Supabase Auth) AND `users` table
- Check that the `id` in `users` table matches the `id` in `auth.users`

### "Invalid credentials" error
- Verify email and password are correct
- Check that email provider is enabled in Supabase Authentication settings
- Make sure "Auto Confirm" was checked when creating the user

### Can't see dashboard after login
- Check the user's `role` field in the `users` table (should be 'admin' or 'staff')
- Verify the user record exists in the `users` table
- Check browser/app console for errors

### Registration works but can't login
- Supabase may require email confirmation
- Go to Authentication > Settings and disable "Enable email confirmations" for testing
- Or check your email for confirmation link

## Quick Test Checklist

- [ ] Supabase project created
- [ ] Database schema run (`database/schema.sql`)
- [ ] Environment variables set (`.env` file)
- [ ] Email provider enabled in Supabase
- [ ] Test admin user created
- [ ] Test staff user created
- [ ] App running (`npm start`)
- [ ] Can login as admin
- [ ] Can login as staff
- [ ] See different dashboards for each role

## Notes

- For production, always use secure passwords
- Email confirmation can be disabled for testing
- Staff users need a `company_id` to function properly
- Admin users don't need a `company_id` (can be null)


