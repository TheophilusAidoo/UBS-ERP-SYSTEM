# Troubleshooting Client Login Issues

## Problem: "Invalid login credentials" Error

If a client created from the invoice form cannot log in, follow these steps:

## Step 1: Verify Auth User Exists

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Search for the client's email address
3. Check if the user exists and is **confirmed** (green checkmark)

**If user doesn't exist:**
- The auth user creation failed during invoice creation
- The client record exists but has no `auth_user_id`
- **Fix**: Create the auth user manually or recreate the client account

**If user exists but is not confirmed:**
- **Fix**: Click the user → "..." → "Confirm Email"

## Step 2: Verify Email Match

The email used for login must **exactly match** (case-insensitive) the email in:
1. The `auth.users` table
2. The `clients` table

**Check in Supabase SQL Editor:**
```sql
-- Check email matches
SELECT 
  c.email as client_email,
  a.email as auth_email,
  LOWER(TRIM(c.email)) = LOWER(TRIM(a.email)) as emails_match
FROM clients c
LEFT JOIN auth.users a ON a.id = c.auth_user_id
WHERE c.email = 'client@example.com';
```

## Step 3: Verify Password

The password used for login must match the password that was:
1. **Set when creating the client account**, OR
2. **Sent in the welcome email**

**Common Issues:**
- Auto-generated password was created but not sent to client
- Client is using wrong password
- Password was changed/reset after account creation

**Fix Options:**

### Option A: Reset Password (Recommended)
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find the client's email
3. Click "..." → "Reset Password"
4. Set a new password
5. Send the new password to the client securely

### Option B: Use Password from Invoice Creation
If the client was created from an invoice form:
1. The password was either:
   - **Provided by admin/staff** during invoice creation, OR
   - **Auto-generated** and displayed in the success message
2. Check the invoice creation logs or success message for the password
3. If auto-generated, it should have been sent to the client's email

### Option C: Check Welcome Email
1. Check the client's inbox for the welcome email
2. The email should contain:
   - Email address
   - Password (either provided or auto-generated)
   - Login link

**If welcome email wasn't received:**
- Email sending may have failed
- Check email server logs
- The password should still be displayed in the invoice creation success message (if auto-generated)

## Step 4: Verify auth_user_id is Set

The `clients` table must have `auth_user_id` set to link to the auth user.

**Check in Supabase SQL Editor:**
```sql
-- Check auth_user_id is set
SELECT 
  id,
  email,
  auth_user_id,
  CASE 
    WHEN auth_user_id IS NULL THEN '❌ Missing - Client cannot log in'
    ELSE '✅ Set - Client can log in'
  END as login_status
FROM clients
WHERE email = 'client@example.com';
```

**If `auth_user_id` is NULL:**
- The auth user wasn't created or linked properly
- **Fix**: 
  1. Find the auth user ID in `auth.users`
  2. Update the client record:
  ```sql
  UPDATE clients 
  SET auth_user_id = 'auth_user_uuid_here' 
  WHERE email = 'client@example.com';
  ```

## Step 5: Test Login Directly in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find the client's email
3. Click "..." → "Reset Password"
4. Set a known password (e.g., "test123456")
5. Try logging in with:
   - Email: client@example.com
   - Password: test123456

**If this works:**
- The issue was the password, not the account setup
- Update the password in the system or send the new password to the client

**If this doesn't work:**
- There may be an issue with RLS policies or the auth setup
- Check browser console for detailed error messages

## Step 6: Check Browser Console

When the client tries to log in, check the browser console (F12) for:

```
🔐 Attempting login for: client@example.com
✅ Auth successful, fetching user profile...
🔍 Checking if user is a client...
✅ Client found by auth_user_id OR ✅ Client found by email
✅ Client profile found: { id, email, authUserId, name }
```

**If you see "Client not found":**
- The client lookup is failing (RLS issue or email mismatch)
- Run the RLS fix SQL: `database/fix-clients-rls-with-function.sql`

**If you see "Invalid login credentials":**
- The auth user doesn't exist, OR
- The password doesn't match, OR
- The email doesn't match

## Common Solutions

### Solution 1: Recreate Client Account
If the auth user creation failed:

1. Delete the client record (optional):
   ```sql
   DELETE FROM clients WHERE email = 'client@example.com';
   ```

2. Delete the auth user (if exists):
   - Go to Supabase Dashboard → Authentication → Users
   - Find and delete the user

3. Create a new invoice with "Create client account" checked
4. Use a simple password (e.g., "test123456") that you can share with the client
5. Verify the welcome email was sent

### Solution 2: Manual Auth User Creation
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter:
   - Email: client@example.com
   - Password: (set a known password)
   - ✅ Check "Auto Confirm User"
4. Click "Create User"
5. Note the User ID
6. Update the client record:
   ```sql
   UPDATE clients 
   SET auth_user_id = 'user_id_from_step_5' 
   WHERE email = 'client@example.com';
   ```
7. Send the password to the client

### Solution 3: Reset Password for Existing User
1. Go to Supabase Dashboard → Authentication → Users
2. Find the client's email
3. Click "..." → "Reset Password"
4. Set a new password
5. Send the new password to the client securely

## Prevention

To prevent this issue in the future:

1. **Always provide a password** when creating client accounts (don't rely on auto-generation unless necessary)
2. **Verify welcome email was sent** after creating a client account
3. **Save the auto-generated password** if shown in the success message
4. **Check Supabase Dashboard** after creating a client to verify:
   - Auth user was created
   - User is confirmed
   - `auth_user_id` is set in clients table

## Still Not Working?

If none of the above solutions work:

1. **Check Supabase Logs**: Dashboard → Logs → Postgres Logs
2. **Check Email Server Logs**: Verify emails are being sent
3. **Try logging in as admin/staff** to verify the login system works
4. **Check RLS Policies**: Verify client RLS policies are applied
5. **Verify Service Role Key**: Ensure `VITE_SUPABASE_SERVICE_ROLE_KEY` is set in `.env`

Share the error messages and logs for further debugging.
