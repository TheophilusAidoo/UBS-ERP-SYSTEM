# 🔧 Fix Quick Login Issue

## Problem
Quick login buttons are failing with error: **"Email address 'admin@ubs.com' is invalid"**

This is a Supabase email validation issue. The solution is to create users manually in Supabase first.

## ✅ Solution: Manual User Creation

### Step 1: Create Users in Supabase Authentication

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project: `shejpknspmrlgbjhhptx`

2. **Navigate to Authentication:**
   - Click **Authentication** in the left sidebar
   - Click **Users**

3. **Create Admin User:**
   - Click **"Add User"** → **"Create new user"**
   - **Email:** `admin@ubs.com`
   - **Password:** `test123`
   - ✅ **Check "Auto Confirm User"** (important!)
   - Click **"Create User"**

4. **Create Staff User:**
   - Click **"Add User"** → **"Create new user"**
   - **Email:** `staff@ubs.com`
   - **Password:** `test123`
   - ✅ **Check "Auto Confirm User"**
   - Click **"Create User"**

### Step 2: Create User Profiles in Database

1. **Go to SQL Editor:**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run the test users script:**
   - Open `database/test-users.sql` in your project
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify users:**
   - The script will show you the created users
   - You should see both admin and staff users

### Step 3: Test Login

1. **Go to:** http://localhost:3002/login
2. **Use manual login:**
   - Email: `admin@ubs.com`
   - Password: `test123`
   - Click **Login**

OR

3. **Use Quick Login buttons:**
   - After creating users manually, the quick login buttons should work
   - Click **"👤 Admin"** or **"👨‍💼 Staff"**

## 🔍 Why This Happens

Supabase has strict email validation that sometimes rejects certain email formats during automatic registration. Creating users manually in the Supabase Dashboard bypasses this validation.

## ✅ Alternative: Disable Email Validation (Advanced)

If you want to allow automatic registration:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Look for **"Email validation"** or **"Email format"** settings
3. Adjust validation rules (if available)
4. Note: This may not be available in all Supabase plans

## 📝 After Manual Creation

Once users are created manually:
- ✅ Quick login buttons will work
- ✅ Manual login will work
- ✅ Users will have proper profiles in the database

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for detailed errors
2. **Verify users exist:**
   - Supabase Dashboard → Authentication → Users
   - Should see `admin@ubs.com` and `staff@ubs.com`
3. **Verify profiles exist:**
   - Supabase Dashboard → Table Editor → users
   - Should see both users with roles set
4. **Check database schema:**
   - Make sure `database/schema.sql` has been run
   - Verify `users` table exists


