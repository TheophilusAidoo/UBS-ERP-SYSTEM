# 🔑 How to Reset Admin Password in Supabase

## 🎯 EASIEST METHOD: Delete and Recreate User

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard
2. Sign in if needed
3. **Click on your project name** (should be visible on the main dashboard)

### Step 2: Find Authentication Section
Look at the **LEFT SIDEBAR** - you should see:
```
🏠 Home
🔐 Authentication  ← CLICK HERE
📊 Database
📝 SQL Editor
⚙️ Settings
```

### Step 3: Click on "Users"
After clicking "Authentication", you'll see a submenu or tabs:
- Click on **"Users"** (it might be a tab at the top, or in the submenu)

### Step 4: Find the User
You should see a **TABLE** with columns like:
- Email
- Created
- Last Sign In
- etc.

Look for the row with email: `admin@ubs.com`

### Step 5: Delete the User
1. **Click anywhere on the row** where `admin@ubs.com` is listed
2. OR look for a **trash icon** 🗑️ or **"Delete"** button
3. Click **"Delete"** and confirm

### Step 6: Create New User
1. Look for a button that says **"Add User"** or **"Create User"** (usually at the top right)
2. Click it
3. Select **"Create new user"** (if there's a dropdown)
4. Fill in:
   - **Email**: `admin@ubs.com`
   - **Password**: `admin@ubs1234`
   - ✅ **IMPORTANT**: Check the box that says **"Auto Confirm User"** or **"Email Confirmed"**
5. Click **"Create User"** or **"Save"**

### Step 7: Create User Profile (Run SQL)
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** button
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

4. Click **"Run"** button (or press Ctrl/Cmd + Enter)
5. You should see a success message

### Step 8: Test Login
1. Go back to your app login page
2. Enter:
   - Email: `admin@ubs.com`
   - Password: `admin@ubs1234`
3. Click **"Login"**

---

## 🔄 ALTERNATIVE: If You Can't Find "Users"

### Option A: Use Table Editor
1. Go to **"Table Editor"** in the left sidebar
2. Look for a table called **"auth.users"** or just **"users"**
3. Find the row with `admin@ubs.com`
4. Click on it to edit

### Option B: Use SQL Editor Directly
1. Go to **"SQL Editor"**
2. Click **"New Query"**
3. Run this to see the user:

```sql
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@ubs.com';
```

4. If the user exists, delete it:

```sql
-- WARNING: This deletes the user from auth
-- You'll need to recreate it in the Dashboard
DELETE FROM auth.users WHERE email = 'admin@ubs.com';
```

5. Then create it again in Dashboard (follow Step 6 above)

---

## 🚀 QUICK WORKAROUND: Use Quick Login Button

If you just need to test the system RIGHT NOW:

1. On the login screen, look for a button that says **"👤 Admin"**
2. Click it
3. It will create a temporary mock user and log you in
4. **Note**: This is just for testing - you should still fix the password properly

---

## 📸 What to Look For in Supabase Dashboard

The Authentication page should look something like this:

```
┌─────────────────────────────────────────┐
│  Authentication                          │
├─────────────────────────────────────────┤
│  [Users] [Policies] [Providers] [Settings] ← Tabs
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ [+ Add User]              [Search]│ │ ← Top bar
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Email          Created    Actions  │ │
│  ├───────────────────────────────────┤ │
│  │ admin@ubs.com  2024-...   [Edit]   │ │ ← User row
│  │ staff@ubs.com  2024-...   [Edit]   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## ❓ Still Can't Find It?

1. **Check URL**: Make sure you're at `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`
2. **Try different browser**: Sometimes UI elements don't load properly
3. **Refresh the page**: Press F5 or Ctrl/Cmd + R
4. **Look for search**: Use Ctrl/Cmd + F to search for "admin@ubs.com" on the page
5. **Check project**: Make sure you selected the correct Supabase project

---

## ✅ After Resetting Password

Once you've reset the password to `admin@ubs1234`:
- ✅ Login should work
- ✅ You'll see a green success popup
- ✅ You'll be redirected to the admin dashboard


