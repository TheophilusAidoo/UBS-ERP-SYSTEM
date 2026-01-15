# 🔧 Fix Admin Login - Quick Solution

## Problem
Admin login is failing with "Invalid login credentials" error.

## ✅ Solution: Reset Admin Password in Supabase

### Step 1: Go to Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: `shejpknspmrlgbjhhptx`

### Step 2: Reset Admin Password
1. Click **Authentication** → **Users**
2. Find `admin@ubs.com` in the list
3. Click the **"..."** menu next to the user
4. Click **"Reset Password"**
5. Set password to: `test123` (or your preferred password)
6. Click **"Update User"**

### Step 3: Try Login Again
1. Go back to your app
2. Enter:
   - Email: `admin@ubs.com`
   - Password: `test123` (or the password you just set)
3. Click **Login**

## 🔄 Alternative: Create Auth User (if it doesn't exist)

If the user doesn't exist in Authentication:

1. In Supabase Dashboard → Authentication → Users
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - **Email:** `admin@ubs.com`
   - **Password:** `test123`
   - ✅ **Check "Auto Confirm User"** (important!)
4. Click **"Create User"**

## ✅ What I Fixed

The login code now:
- ✅ Automatically creates auth user if profile exists but auth user doesn't
- ✅ Updates profile ID to match auth user ID if they don't match
- ✅ Uses email lookup first (more reliable than ID lookup)
- ✅ Provides clear error messages with instructions

## 🧪 Test Login

After resetting password:
1. Go to login screen
2. Enter `admin@ubs.com` and your password
3. Should login successfully!

## 📝 Note

Your profile exists in the database with ID: `01345921-b4e9-46ec-a5a3-bf3f2b151c31`

The login code will now:
- Find your profile by email
- Create auth user if needed
- Match IDs automatically
- Login successfully!
