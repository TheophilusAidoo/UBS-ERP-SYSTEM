# Debug Client Login Issues

## Changes Made

1. **Added Admin Client Support**: The login now uses the service role key (if available) to bypass RLS when checking for client profiles. This ensures the lookup works even if RLS policies are misconfigured.

2. **Improved Error Logging**: Added detailed console logs to help diagnose issues.

3. **Automatic auth_user_id Update**: If a client is found by email but missing `auth_user_id`, it's automatically updated during login.

## How to Debug

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Try to log in as a client**
3. **Look for these console messages**:

```
🔐 Attempting login for: client@example.com
✅ Auth successful, fetching user profile...
🔍 Checking if user is a client...
🔍 Using admin client (bypasses RLS) OR regular client (subject to RLS)
✅ Client found by auth_user_id OR ✅ Client found by email
✅ Client profile found: { id, email, authUserId, name }
```

## Common Issues

### Issue 1: "Client not found"
**Symptoms**: Console shows "ℹ️ Client not found"
**Causes**:
- Client doesn't exist in `clients` table
- Email doesn't match (case-sensitive or whitespace)
- `auth_user_id` doesn't match
- Client is marked as `is_active = false`

**Fix**:
1. Check Supabase Dashboard → Table Editor → `clients`
2. Verify the client exists
3. Check `email` matches exactly (will be normalized to lowercase)
4. Check `auth_user_id` matches the auth user ID
5. Check `is_active` is `true`

### Issue 2: "Using regular client (subject to RLS)"
**Symptoms**: Console shows this message instead of "admin client"
**Cause**: `VITE_SUPABASE_SERVICE_ROLE_KEY` is not set in `.env`

**Fix**:
1. Check `.env` file has:
   ```
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
2. Get service role key from Supabase Dashboard → Settings → API → `service_role` key
3. Restart the dev server after updating `.env`

### Issue 3: "Error checking for client profile"
**Symptoms**: Console shows error details
**Possible Causes**:
- RLS policy is blocking (if using regular client)
- Database connection issue
- Table doesn't exist

**Fix**:
1. If using regular client, verify RLS policies:
   ```sql
   -- Check if policies exist
   SELECT * FROM pg_policies WHERE tablename = 'clients';
   ```
2. Run the RLS fix SQL from `database/fix-clients-rls-for-login.sql`
3. Check database connection

### Issue 4: Login succeeds but user is not redirected
**Symptoms**: No error, but stays on login page
**Possible Cause**: Auth store not updating correctly

**Fix**:
1. Check console for "✅ Login successful, setting user in store"
2. Check if localStorage has `ubs_erp_user`
3. Check routing configuration in `App.tsx`

## Verification Steps

1. **Check Client Exists**:
   ```sql
   SELECT id, email, auth_user_id, is_active, name 
   FROM clients 
   WHERE email = 'client@example.com';
   ```

2. **Check Auth User Exists**:
   - Go to Supabase Dashboard → Authentication → Users
   - Find the client's email
   - Verify user is confirmed (green checkmark)
   - Note the user ID

3. **Verify auth_user_id Match**:
   ```sql
   SELECT c.email, c.auth_user_id, a.id as auth_id
   FROM clients c
   LEFT JOIN auth.users a ON a.id = c.auth_user_id
   WHERE c.email = 'client@example.com';
   ```
   - `auth_user_id` should match `auth_id`

4. **Check RLS Policies**:
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'clients';
   ```
   - Should see "Clients can view own profile" policy

## Test Login Flow

1. Clear browser storage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. Open browser console

3. Try to log in with client credentials

4. Check console logs step by step

5. If it fails, note the exact error message and step

## Quick Fix Checklist

- [ ] Client exists in `clients` table
- [ ] Client `is_active = true`
- [ ] Client `email` matches login email (case-insensitive)
- [ ] Auth user exists in `auth.users`
- [ ] Auth user is confirmed
- [ ] `auth_user_id` matches auth user ID (or is NULL, will be updated)
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- [ ] RLS policies are created (run SQL from `database/fix-clients-rls-for-login.sql`)
- [ ] Dev server restarted after `.env` changes
