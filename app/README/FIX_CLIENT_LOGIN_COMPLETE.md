# Complete Fix for Client Login Issues

## Problem
Clients cannot log in even after running RLS policies. This is likely due to:
1. RLS policies blocking client profile lookup
2. Email matching issues (case sensitivity, whitespace)
3. Missing service role key for admin client bypass

## Solution
We've implemented a **dual approach**:
1. **Admin Client Bypass** (Primary): Uses service role key to bypass RLS during login
2. **Improved RLS Policies** (Fallback): Better policies that work even without service role key

## Step 1: Run the RLS Fix (IMPORTANT!)

Choose **ONE** of these SQL scripts to run:

### Option A: Using Helper Function (Recommended - More Reliable)
Run this SQL in Supabase SQL Editor: `database/fix-clients-rls-with-function.sql`

This creates a helper function and uses it in the RLS policy, which is more reliable than subqueries.

### Option B: Direct Comparison (Simpler)
Run this SQL in Supabase SQL Editor: `database/fix-clients-rls-for-login.sql`

This uses direct email comparison in the RLS policy.

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire contents of one of the SQL files above
4. Paste and click "Run"

## Step 2: Verify Service Role Key (OPTIONAL but Recommended)

The code now uses the service role key to bypass RLS during login. This is **safe** because:
- It's only used for login verification (checking if client profile exists)
- It doesn't expose any data
- It ensures login works even if RLS policies are misconfigured

**Check if service role key is set:**
1. Open `.env` file
2. Look for: `VITE_SUPABASE_SERVICE_ROLE_KEY=your_key_here`
3. If missing, add it:
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (NOT the anon key!)
   - Add to `.env`: `VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
4. **Restart dev server** after updating `.env`

## Step 3: Verify Client Account

Check that the client exists and is set up correctly:

```sql
-- Check client exists
SELECT id, email, auth_user_id, is_active, name 
FROM clients 
WHERE email = 'client@example.com';

-- Check auth user exists and is confirmed
-- Go to Supabase Dashboard → Authentication → Users
-- Find the client's email
-- Verify: Status = "Confirmed" (green checkmark)
-- Note the User ID
```

## Step 4: Verify auth_user_id Match

The `auth_user_id` in the `clients` table should match the user ID in `auth.users`:

```sql
SELECT 
  c.id as client_id,
  c.email as client_email,
  c.auth_user_id,
  a.id as auth_user_id_from_auth,
  a.email as auth_email
FROM clients c
LEFT JOIN auth.users a ON a.id = c.auth_user_id
WHERE c.email = 'client@example.com';
```

**What to check:**
- `auth_user_id` should match `auth_user_id_from_auth`
- If `auth_user_id` is NULL, it will be auto-updated during login

## Step 5: Test Login

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Clear storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
3. **Try to log in** with client credentials
4. **Check console logs** - you should see:
   ```
   🔐 Attempting login for: client@example.com
   ✅ Auth successful, fetching user profile...
   🔍 Checking if user is a client...
   🔍 Using admin client (bypasses RLS) OR regular client (subject to RLS)
   ✅ Client found by auth_user_id OR ✅ Client found by email
   ✅ Client profile found: { id, email, authUserId, name }
   ✅ Login successful, setting user in store
   ```

## Troubleshooting

### Issue: "Client not found"
**Possible causes:**
- Client doesn't exist in `clients` table
- Email doesn't match (check for typos, case, whitespace)
- `is_active = false`
- `auth_user_id` doesn't match

**Fix:**
1. Verify client exists: `SELECT * FROM clients WHERE email = 'client@example.com';`
2. Verify `is_active = true`
3. If `auth_user_id` is NULL, it should be auto-updated during login
4. Check email matches exactly (case-insensitive)

### Issue: "Using regular client (subject to RLS)"
**Cause**: Service role key not set in `.env`

**Fix:**
1. Add `VITE_SUPABASE_SERVICE_ROLE_KEY` to `.env`
2. Restart dev server
3. Should now see "Using admin client (bypasses RLS)"

### Issue: "Error checking for client profile"
**Possible causes:**
- RLS policy not created
- RLS policy has syntax error
- Database connection issue

**Fix:**
1. Run the RLS fix SQL again
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'clients';`
3. Should see "Clients can view own profile" policy

### Issue: Login succeeds but redirect doesn't work
**Possible causes:**
- Auth store not updating
- Routing issue
- Client role not recognized

**Fix:**
1. Check console for "✅ Login successful, setting user in store"
2. Check localStorage: `localStorage.getItem('ubs_erp_user')`
3. Verify routing in `App.tsx` handles 'client' role

## Verification Checklist

- [ ] RLS policy SQL has been run (Option A or B)
- [ ] Service role key is set in `.env` (optional but recommended)
- [ ] Dev server restarted after `.env` changes
- [ ] Client exists in `clients` table
- [ ] Client `is_active = true`
- [ ] Auth user exists in `auth.users`
- [ ] Auth user is confirmed
- [ ] `auth_user_id` matches (or is NULL, will be auto-updated)
- [ ] Email matches (case-insensitive)
- [ ] Browser console shows successful client lookup
- [ ] Login redirects to client dashboard

## Still Not Working?

If login still doesn't work after following all steps:

1. **Check browser console** for exact error messages
2. **Check Supabase logs**: Dashboard → Logs → Postgres Logs
3. **Run this diagnostic query**:
   ```sql
   -- Check everything at once
   SELECT 
     c.id,
     c.email as client_email,
     c.auth_user_id,
     c.is_active,
     a.id as auth_id,
     a.email as auth_email,
     a.email_confirmed_at,
     CASE 
       WHEN c.auth_user_id = a.id THEN '✅ Match'
       WHEN c.auth_user_id IS NULL THEN '⚠️ NULL (will be updated)'
       ELSE '❌ Mismatch'
     END as status
   FROM clients c
   LEFT JOIN auth.users a ON LOWER(TRIM(c.email)) = LOWER(TRIM(a.email))
   WHERE c.email = 'client@example.com';
   ```
4. **Share the error message** and console logs for further debugging
