# Reset Admin Password

## The Issue
The login is failing because the password in Supabase doesn't match `admin@ubs1234`.

## Solution: Reset Password in Supabase Dashboard

### Method 1: Via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication:**
   - Click **Authentication** in the left sidebar
   - Click **Users**

3. **Find the admin user:**
   - Look for `admin@ubs.com`
   - Click on the user or click the "..." menu

4. **Reset Password:**
   - Click **"..."** menu (three dots) → **"Reset Password"**
   - OR click **"Edit"** on the user
   - Set the new password to: `admin@ubs1234`
   - Click **"Save"** or **"Update"**

5. **Try logging in again:**
   - Email: `admin@ubs.com`
   - Password: `admin@ubs1234`

### Method 2: Delete and Recreate User

If resetting doesn't work:

1. **Delete the existing user:**
   - Go to Authentication > Users
   - Find `admin@ubs.com`
   - Click "..." → "Delete User"

2. **Create a new admin user:**
   - Click **"Add User"** → **"Create new user"**
   - Email: `admin@ubs.com`
   - Password: `admin@ubs1234`
   - ✅ **Check "Auto Confirm User"** (IMPORTANT!)
   - Click **"Create User"**

3. **Run the SQL script:**
   - Go to SQL Editor
   - Run `database/create-admin-user.sql`

4. **Try logging in again**

## Verify Password is Correct

After resetting, you should be able to login with:
- Email: `admin@ubs.com`
- Password: `admin@ubs1234`

The login screen will now show:
- ✅ **Success popup** if login succeeds
- ❌ **Error popup** if password is wrong


