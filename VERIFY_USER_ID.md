# 🔍 How to Verify User ID Matches

## Step-by-Step Guide

### Method 1: Using Supabase Dashboard (Easiest)

#### Step 1: Check Authentication Users
1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project: `shejpknspmrlgbjhhptx`

2. **Navigate to Authentication:**
   - Click **"Authentication"** in the left sidebar
   - Click **"Users"** tab

3. **Find the Admin User:**
   - Look for `admin@ubs.com` in the list
   - Click on the user to view details

4. **Check the User ID:**
   - The **UUID** (User ID) should be displayed at the top
   - It should be: `812b48ba-6bfe-44e8-815e-817154bada10`

#### Step 2: Check Database Users Table
1. **Navigate to Table Editor:**
   - Click **"Table Editor"** in the left sidebar
   - Click on **"users"** table

2. **Find the Admin User:**
   - Look for the row with email `admin@ubs.com`
   - Check the **"id"** column
   - It should be: `812b48ba-6bfe-44e8-815e-817154bada10`

#### Step 3: Compare IDs
- ✅ **Match:** Both IDs are the same → Login will work!
- ❌ **Different:** IDs don't match → Need to fix (see below)

---

### Method 2: Using SQL Editor (More Detailed)

#### Step 1: Check Authentication User ID
1. **Go to SQL Editor:**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Run this query:**
   ```sql
   SELECT id, email, created_at
   FROM auth.users
   WHERE email = 'admin@ubs.com';
   ```

3. **Check the result:**
   - The `id` column should show: `812b48ba-6bfe-44e8-815e-817154bada10`

#### Step 2: Check Database User Profile ID
1. **In the same SQL Editor, run:**
   ```sql
   SELECT id, email, role, first_name, last_name
   FROM users
   WHERE email = 'admin@ubs.com';
   ```

2. **Check the result:**
   - The `id` column should show: `812b48ba-6bfe-44e8-815e-817154bada10`

#### Step 3: Compare Both Queries
- ✅ **Match:** Both queries return the same ID → Login will work!
- ❌ **Different:** IDs don't match → Need to fix (see below)

---

### Method 3: Single Query to Check Both (Best Method)

Run this single query to check both at once:

```sql
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  u.id as profile_user_id,
  u.email as profile_email,
  u.role,
  CASE 
    WHEN au.id = u.id THEN '✅ IDs MATCH - Login will work!'
    WHEN au.id IS NULL THEN '❌ User NOT in Authentication - Create user first!'
    WHEN u.id IS NULL THEN '❌ User NOT in users table - Run test-users.sql!'
    ELSE '❌ IDs DO NOT MATCH - Need to fix!'
  END as status
FROM auth.users au
FULL OUTER JOIN users u ON au.id = u.id
WHERE au.email = 'admin@ubs.com' OR u.email = 'admin@ubs.com';
```

**Expected Result (if everything is correct):**
```
auth_user_id: 812b48ba-6bfe-44e8-815e-817154bada10
auth_email: admin@ubs.com
profile_user_id: 812b48ba-6bfe-44e8-815e-817154bada10
profile_email: admin@ubs.com
role: admin
status: ✅ IDs MATCH - Login will work!
```

---

## 🔧 If IDs Don't Match - How to Fix

### Option 1: Update Database User Profile (Recommended)

If the Authentication user exists but has a different ID:

1. **Get the correct ID from Authentication:**
   - Go to Authentication → Users
   - Find `admin@ubs.com`
   - Copy the UUID (e.g., `abc123-def456-...`)

2. **Update the users table:**
   ```sql
   -- Replace 'CORRECT_ID_FROM_AUTH' with the actual ID from Authentication
   UPDATE users
   SET id = 'CORRECT_ID_FROM_AUTH'
   WHERE email = 'admin@ubs.com';
   ```

### Option 2: Delete and Recreate (If Option 1 doesn't work)

1. **Delete from users table:**
   ```sql
   DELETE FROM users WHERE email = 'admin@ubs.com';
   ```

2. **Recreate using the correct ID:**
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

---

## ✅ Quick Verification Checklist

- [ ] User exists in Authentication → Users
- [ ] User exists in Table Editor → users table
- [ ] Both IDs are exactly the same
- [ ] Email matches: `admin@ubs.com`
- [ ] Role is set to: `admin`

---

## 🧪 Test After Verification

Once IDs match:

1. **Go to:** http://localhost:3002/login
2. **Enter:**
   - Email: `admin@ubs.com`
   - Password: `test123`
3. **Click Login**

Should redirect to dashboard! 🎉


