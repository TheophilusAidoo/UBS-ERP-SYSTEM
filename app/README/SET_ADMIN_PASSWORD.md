# 🔐 Set Admin Password - Quick Guide

## ✅ Method 1: Run Script (Easiest)

### Step 1: Make sure you have .env file
Check that your `.env` file has:
```
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 2: Run the script
```bash
node set-admin-password.js
```

This will:
- Find or create the admin auth user
- Set password to: `adminubs@1234`
- Update profile ID if needed
- Confirm the email automatically

## ✅ Method 2: Manual SQL (If script doesn't work)

### Step 1: Get Auth User ID
Go to Supabase Dashboard → SQL Editor and run:
```sql
SELECT id, email FROM auth.users WHERE email = 'admin@ubs.com';
```

### Step 2: Update Password
Use Supabase Admin API or Dashboard:
1. Go to Authentication → Users
2. Find `admin@ubs.com`
3. Click "..." → "Reset Password"
4. Enter: `adminubs@1234`
5. Click "Update"

## ✅ Method 3: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Users**
4. Find `admin@ubs.com` (or create it if it doesn't exist)
5. Click **"..."** → **"Reset Password"**
6. Enter: `adminubs@1234`
7. Click **"Update User"**

## 🧪 Test Login

After setting password:
- Email: `admin@ubs.com`
- Password: `adminubs@1234`

## 📝 Note

The script will automatically:
- Create auth user if it doesn't exist
- Update password if it exists
- Match profile ID with auth user ID
- Confirm email automatically
