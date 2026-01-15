# Fix Client Login - RLS Policy Update

## Problem
Clients cannot log in because Row Level Security (RLS) policies don't allow them to view their own profile during login.

## Solution
Run the SQL migration to add RLS policies that allow clients to view and update their own profiles.

## Quick Fix

### Option 1: Run the Migration File (Recommended)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file: `database/fix-clients-rls-for-login.sql`
6. Copy the entire contents
7. Paste into the SQL Editor
8. Click **Run** (or press Ctrl/Cmd + Enter)

### Option 2: Manual SQL
Run this SQL in Supabase SQL Editor:

```sql
-- Add policy to allow clients to view their own profile (by auth_user_id)
DROP POLICY IF EXISTS "Clients can view own profile" ON clients;
CREATE POLICY "Clients can view own profile" ON clients
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Add policy to allow clients to update their own profile
DROP POLICY IF EXISTS "Clients can update own profile" ON clients;
CREATE POLICY "Clients can update own profile" ON clients
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
```

## What This Does

- ✅ Allows clients to view their own profile during login
- ✅ Allows clients to update their own profile
- ✅ Works even if `auth_user_id` is not set (checks by email)
- ✅ Does not affect staff/admin policies

## After Running

1. Try logging in with the client credentials
2. The login should now work successfully
3. Client will be redirected to the client dashboard

## Verification

To verify the policies were created:
1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Filter by table: `clients`
3. You should see:
   - ✅ "Clients can view own profile"
   - ✅ "Clients can update own profile"
   - ✅ "Staff can view clients from their company"
   - ✅ Other existing policies

## Troubleshooting

If login still doesn't work after running the SQL:
1. Check browser console for any error messages
2. Verify the client was created with `auth_user_id` set
3. Verify the email matches exactly (case-insensitive)
4. Check Supabase logs for RLS violations
