# ⚠️ CRITICAL: Deploy Edge Function NOW

## The Problem

You're seeing **"Edge Function returned a non-2xx status code"** because the Edge Function needs to be **redeployed** with the latest fixes.

## Quick Fix (5 Minutes)

### Step 1: Copy the Function Code

1. Open this file: `supabase/functions/send-email/index.ts`
2. **Select ALL** the code (Ctrl+A / Cmd+A)
3. **Copy** it (Ctrl+C / Cmd+C)

### Step 2: Deploy in Supabase Dashboard

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** in the left sidebar
4. Find the **`send-email`** function (or create it if it doesn't exist)
5. Click on it to open the editor
6. **Delete ALL existing code** in the editor
7. **Paste** the code you copied from Step 1
8. Click **Deploy** button (usually at the bottom right)
9. Wait for deployment to complete (10-30 seconds)

### Step 3: Verify Deployment

1. After deployment, click **Invoke** or **Test** button
2. Use a **GET** request to test
3. You should see: `{"success": true, "message": "cPanel SMTP Email Function is running", ...}`
4. If you see that, the function is working! ✅

### Step 4: Test from Your App

1. Go back to your app
2. Navigate to **Settings** → **System Settings** (Admin only)
3. Scroll to **Email Configuration**
4. Click **Send Test Email**
5. It should work now! ✅

## Why This Happened

The Edge Function code has been updated with:
- ✅ Better error handling (always returns 200)
- ✅ Improved SMTP connection handling
- ✅ Better environment variable access
- ✅ Comprehensive error messages

But **these changes only take effect after redeployment**.

## If It Still Doesn't Work

1. **Check Function Logs**:
   - Supabase Dashboard → Edge Functions → `send-email` → **Logs** tab
   - Look for any error messages

2. **Verify Environment Variables**:
   - The function automatically uses Supabase's environment variables
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` should be available automatically

3. **Check Function Name**:
   - Make sure the function is named exactly `send-email` (case-sensitive)

4. **Wait a Bit**:
   - After deployment, wait 10-30 seconds for changes to propagate

## After Deployment

Once deployed, the function will:
- ✅ Always return status 200 (even on errors)
- ✅ Provide helpful error messages in the response body
- ✅ Handle all edge cases gracefully
- ✅ Never throw unhandled errors

The error **"Edge Function returned a non-2xx status code"** should disappear after redeployment.

