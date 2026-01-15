# Reset Admin Password - Step by Step Guide

## Method 1: Via Supabase Dashboard UI

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Sign in if needed
3. Select your project (should be visible on the dashboard)

### Step 2: Navigate to Users
1. In the left sidebar, look for **"Authentication"** (it has a key/lock icon)
2. Click on **"Authentication"**
3. You should see a submenu. Click on **"Users"** (or it might be the first option)

### Step 3: Find the Admin User
1. You should see a table/list of users
2. Look for the user with email: `admin@ubs.com`
3. Click on the **row** where this user is listed (the entire row should be clickable)

### Step 4: Edit the User
Once you click on the user row, you should see:
- **Option A**: A side panel opens on the right with user details
  - Look for a **"Password"** field or **"Update Password"** button
  - Enter: `admin@ubs1234`
  - Click **"Save"** or **"Update"**

- **Option B**: You see an "Edit" button
  - Click **"Edit"**
  - Find the password field
  - Enter: `admin@ubs1234`
  - Click **"Save"**

### Alternative: If you see a "..." menu
1. Look for three dots (⋯) or a menu icon on the right side of the user row
2. Click it
3. Look for options like:
   - "Reset Password"
   - "Edit User"
   - "Update Password"
   - "Change Password"

## Method 2: Delete and Recreate User (If Edit Doesn't Work)

### Step 1: Delete Existing User
1. Go to Authentication > Users
2. Find `admin@ubs.com`
3. Click on the user row
4. Look for a **"Delete"** button (usually red, at the bottom)
5. Confirm deletion

### Step 2: Create New User
1. In the same Users page, click **"Add User"** button (usually at the top right)
2. Select **"Create new user"**
3. Fill in:
   - **Email**: `admin@ubs.com`
   - **Password**: `admin@ubs1234`
   - ✅ **Check "Auto Confirm User"** (VERY IMPORTANT!)
4. Click **"Create User"**

### Step 3: Create User Profile
1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
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
```

4. Click **"Run"** (or press Ctrl/Cmd + Enter)

## Method 3: Via SQL (Advanced - Requires Service Role)

If you have service_role access, you can reset the password directly via SQL:

1. Go to **SQL Editor**
2. Click **"New Query"**
3. Run this (NOTE: This requires service_role key, may not work with anon key):

```sql
-- This might not work without service_role access
-- But you can try it
UPDATE auth.users 
SET encrypted_password = crypt('admin@ubs1234', gen_salt('bf'))
WHERE email = 'admin@ubs.com';
```

**Note**: This method usually doesn't work with the anon key. Use Method 1 or 2 instead.

## Visual Guide

The Supabase Dashboard layout should look like this:

```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
├─────────────────────────────────────┤
│  [Sidebar]                          │
│  - Home                             │
│  - Authentication  ← Click here    │
│    - Users         ← Then here     │
│    - Policies                       │
│    - Providers                      │
│  - Database                          │
│  - SQL Editor                        │
│  ...                                 │
└─────────────────────────────────────┘
```

## Still Can't Find It?

If you still can't find the menu:
1. **Check the URL** - Make sure you're in the right project
2. **Look for "Users" tab** - It might be a tab at the top of the Authentication page
3. **Try searching** - Use Ctrl/Cmd + F to search for "admin@ubs.com" on the page
4. **Check different views** - Some Supabase versions have different layouts

## Quick Alternative: Use Quick Login Button

If you just want to test the system, you can use the **"👤 Admin"** quick login button on the login screen. However, this won't work if the password is wrong.


