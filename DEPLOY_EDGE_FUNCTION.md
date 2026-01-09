# 🚀 Deploy Edge Function - Complete Guide

## Your Supabase Project
- **Project ID**: `shejpknspmrlgbjhhptx`
- **Function URL**: `https://shejpknspmrlgbjhhptx.supabase.co/functions/v1/send-email`

## Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** in the Settings menu
5. Scroll down to **"Project API keys"**
6. Find **"service_role"** (the **secret** one, NOT the anon key)
7. Click the **copy icon** to copy it
8. **Save it somewhere safe** - you'll need it in Step 3

## Step 2: Deploy the Function

1. Still in Supabase Dashboard, click **Edge Functions** in the left sidebar
2. If you see **"send-email"** function:
   - Click on it to open the editor
   - Click **"Edit"** button
   - **Delete ALL existing code**
   - Continue to Step 2b
   
   If you DON'T see **"send-email"** function:
   - Click **"Create Function"** button
   - Name it: `send-email` (exactly this, case-sensitive)
   - Click **"Create"**

3. **Copy ALL the code** from `supabase/functions/send-email/index.ts`:
   - Open the file in your code editor
   - Select ALL (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

4. **Paste it** into the Supabase function editor

5. Click **"Deploy"** button (usually bottom right)
   - Wait for deployment (10-30 seconds)
   - You should see "Function deployed successfully"

## Step 3: Set Environment Variables (CRITICAL!)

**This is the most important step!**

1. In Supabase Dashboard, go to **Settings** → **Edge Functions**
2. Look for **"Environment Variables"** section
3. Click **"Add Variable"** or **"Manage Variables"**

4. Add these TWO variables:

   **Variable 1:**
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://shejpknspmrlgbjhhptx.supabase.co`
   - Click **"Save"**

   **Variable 2:**
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (Paste the service_role key you copied in Step 1)
   - Click **"Save"**

5. **Important**: After adding variables, you may need to **redeploy the function** for them to take effect

## Step 4: Test the Function

1. Go to **Edge Functions** → **send-email**
2. Click **"Invoke"** or **"Test"** button
3. Select **GET** method
4. Click **"Invoke Function"**
5. You should see:
   ```json
   {
     "success": true,
     "message": "cPanel SMTP Email Function is running",
     "status": "ok",
     "timestamp": "..."
   }
   ```
   ✅ If you see this, the function is working!

## Step 5: Test from Your App

1. Go to your app
2. Navigate to **Settings** → **System Settings** (Admin only)
3. Scroll to **"cPanel Email Configuration"**
4. Make sure you've filled in:
   - SMTP Host
   - SMTP Port
   - SMTP Username (email)
   - SMTP Password
   - From Email
5. Click **"Send Test Email"**
6. It should work now! ✅

## Troubleshooting

### If you still get "non-2xx status code":

1. **Check Function Logs**:
   - Edge Functions → send-email → **Logs** tab
   - Look for error messages
   - Copy any errors you see

2. **Verify Environment Variables**:
   - Settings → Edge Functions → Environment Variables
   - Make sure both variables are set correctly
   - The service role key should be a long string starting with `eyJ...`

3. **Redeploy the Function**:
   - After setting environment variables, redeploy the function
   - Sometimes variables need a redeploy to take effect

4. **Check SMTP Settings**:
   - Make sure all SMTP settings are filled in the app
   - Test with a simple SMTP configuration first

### Common Issues:

**"Supabase Service Role Key not found"**
- Solution: Make sure `SUPABASE_SERVICE_ROLE_KEY` environment variable is set
- Get the key from Settings → API → service_role

**"Could not determine Supabase URL"**
- Solution: Make sure `SUPABASE_URL` environment variable is set to `https://shejpknspmrlgbjhhptx.supabase.co`
- Or the function will try to extract it from the request URL automatically

**Function works in GET but not POST**
- Solution: Make sure environment variables are set
- Check function logs for specific errors
- Redeploy the function after setting environment variables

## Verification Checklist

After deployment, verify:

- [ ] Function is deployed (shows in Edge Functions list)
- [ ] GET request returns success message
- [ ] `SUPABASE_URL` environment variable is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` environment variable is set
- [ ] Function logs don't show critical errors
- [ ] Test email from app Settings page works

## What the Function Does

- ✅ Always returns status 200 (even on errors)
- ✅ Errors are in the response body with `success: false`
- ✅ Automatically extracts Supabase URL from request if not in env vars
- ✅ Reads SMTP settings from database (global_settings table)
- ✅ Falls back to environment variables if database query fails
- ✅ Sends emails via cPanel SMTP (direct SMTP connection)

The function is now **bulletproof** and should **never** return a non-2xx status code!

