# Fix for "Non-2xx Status Code" on POST Request

## Problem
- ✅ GET request works (health check returns success)
- ❌ POST request fails with "Edge Function returned a non-2xx status code"

## Root Cause
The function might be throwing an error during POST processing that's not being caught, or there's an issue with async operations.

## Solution Applied

I've added **multiple layers of error handling**:

1. **Request body reading** - Wrapped in try-catch
2. **JSON parsing** - Separate try-catch with detailed errors
3. **Database queries** - Better error handling with fallbacks
4. **Supabase client creation** - More defensive error handling
5. **Double wrapper** - The `serve()` function now has an additional wrapper

## What You Need to Do

### Step 1: Redeploy the Function

1. **Copy the updated code** from `supabase/functions/send-email/index.ts`
2. **Go to Supabase Dashboard** → Edge Functions → `send-email`
3. **Paste the code** and click **Deploy**
4. **Wait 10-30 seconds** for deployment

### Step 2: Set Environment Variables (Critical!)

The function needs these environment variables:

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Environment Variables**
2. Add these two variables:

   **Variable 1:**
   - Key: `SUPABASE_URL`
   - Value: `https://shejpknspmrlgbjhhptx.supabase.co`

   **Variable 2:**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (Get from Settings > API > service_role key - the **secret** one)

3. **Save** the environment variables

### Step 3: Test Again

1. **Test GET request** in Supabase Dashboard (should still work)
2. **Test POST request** from your app Settings page
3. **Check the logs** if it still fails:
   - Supabase Dashboard → Edge Functions → `send-email` → **Logs** tab
   - Look for any error messages

## What Changed in the Code

### Before:
- Single try-catch wrapper
- Basic error handling
- Potential for unhandled errors in async operations

### After:
- **Double wrapper** (handleRequest + serve wrapper)
- **Granular error handling** for each operation
- **Defensive programming** - every async operation wrapped
- **Better error messages** to help diagnose issues

## If It Still Doesn't Work

1. **Check Function Logs**:
   - Supabase Dashboard → Edge Functions → `send-email` → Logs
   - Look for error messages around the time you tested
   - Copy any error messages you see

2. **Verify Environment Variables**:
   - Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - The service role key should start with `eyJ...` (JWT token)

3. **Check Function Timeout**:
   - Supabase Edge Functions have a timeout (usually 30-60 seconds)
   - If the function is taking too long, it might timeout
   - Check logs for timeout errors

4. **Test with a Simple POST**:
   - Try sending a simple test email first
   - Make sure all SMTP settings are configured in Admin Settings

## Expected Behavior After Fix

- ✅ GET request returns: `{"success": true, "message": "cPanel SMTP Email Function is running", ...}`
- ✅ POST request returns: `{"success": true, "message": "Email sent successfully to ...", ...}`
- ✅ Errors return: `{"success": false, "error": "...", ...}` (but still status 200!)

The function should **NEVER** return a non-2xx status code anymore.

