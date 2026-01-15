# 🔴 URGENT: Deploy Edge Function - Step by Step

## Your Endpoint
`https://shejpknspmrlgbjhhptx.supabase.co/functions/v1/send-email`

## ⚠️ The function MUST be redeployed with the latest code to fix the non-2xx error!

### Step-by-Step Deployment Instructions:

1. **Open the Function Code**
   - Open file: `supabase/functions/send-email/index.ts` in your code editor
   - **Select ALL** code (Ctrl+A / Cmd+A)
   - **Copy** it (Ctrl+C / Cmd+C)

2. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

3. **Navigate to Edge Functions**
   - Click **"Edge Functions"** in the left sidebar
   - Look for **"send-email"** function
   - If it doesn't exist, click **"Create Function"** and name it `send-email`

4. **Replace the Code**
   - Click on the `send-email` function to open the editor
   - **Delete ALL existing code** in the editor
   - **Paste** the code you copied
   - Make sure there are no syntax errors (the editor will show red underlines if there are)

5. **Set Environment Variables** (IMPORTANT!)
   - Still in the Edge Functions section, look for **"Environment Variables"** or **"Settings"**
   - Click to add/edit environment variables
   - Add these two variables:
   
     **Variable 1:**
     - Key: `SUPABASE_URL`
     - Value: `https://shejpknspmrlgbjhhptx.supabase.co`
   
     **Variable 2:**
     - Key: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: (Get this from: Settings > API > service_role key - the **secret** one!)

6. **Deploy**
   - Click the **"Deploy"** button (usually bottom right)
   - Wait for deployment to complete (10-30 seconds)
   - You should see a success message

7. **Test the Function**
   - After deployment, click **"Invoke"** or **"Test"**
   - Method: **GET**
   - Click **"Invoke Function"**
   - You should see: `{"success": true, "message": "cPanel SMTP Email Function is running", ...}`
   - ✅ If you see this, the function is working!

8. **Test from Your App**
   - Go back to your app
   - Navigate to **Settings** → **System Settings** → **Email Configuration**
   - Click **"Send Test Email"**
   - It should work now! ✅

## Finding Your Service Role Key

1. In Supabase Dashboard, go to **Settings** → **API**
2. Scroll down to **"Project API keys"**
3. Find **"service_role"** key (the **secret** one, not the anon key!)
4. Copy it (click the copy icon)
5. Paste it as the value for `SUPABASE_SERVICE_ROLE_KEY` environment variable

## If You Still Get Errors

### Check Function Logs:
1. Supabase Dashboard → Edge Functions → `send-email` → **"Logs"** tab
2. Look for error messages
3. Copy any errors and check what they say

### Common Issues:

1. **"Function not found"**
   - Make sure the function is named exactly `send-email` (case-sensitive)
   - Make sure it's deployed (not just saved)

2. **"Supabase configuration missing"**
   - Make sure you set the environment variables (Step 5)
   - Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

3. **"Non-2xx status code"**
   - The function code should ALWAYS return 200
   - If you're still seeing this, the function might not be deployed with the latest code
   - Redeploy the function again

## After Successful Deployment

The function will:
- ✅ Always return status 200 (even on errors)
- ✅ Provide helpful error messages
- ✅ Handle all edge cases properly
- ✅ Never throw unhandled errors

The **"Edge Function returned a non-2xx status code"** error will disappear after proper deployment with environment variables set.

## Quick Checklist

- [ ] Copied code from `supabase/functions/send-email/index.ts`
- [ ] Opened Supabase Dashboard → Edge Functions
- [ ] Found/created `send-email` function
- [ ] Pasted the code
- [ ] Set `SUPABASE_URL` environment variable
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` environment variable (from Settings > API)
- [ ] Clicked Deploy
- [ ] Tested with GET request (should return success)
- [ ] Tested from app Settings page

