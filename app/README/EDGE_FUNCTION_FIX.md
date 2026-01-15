# Edge Function Error Fix

## What Was Fixed

The "Failed to send a request to the Edge Function" error has been resolved with the following improvements:

### 1. Enhanced Error Handling
- Better error catching and reporting throughout the function
- More descriptive error messages to help diagnose issues
- Proper handling of JSON parsing errors
- Improved CORS headers

### 2. Improved SMTP Library Import
- More reliable SMTP library import with better error messages
- Clearer error reporting if the library fails to load

### 3. Better Frontend Error Handling
- Enhanced error messages in `email.service.ts`
- More helpful debugging information
- Clearer instructions on how to fix deployment issues

### 4. Request Validation
- Better validation of request body
- Handles empty or malformed JSON gracefully

## Common Causes of "Failed to send a request" Error

1. **Function Not Deployed**: The Edge Function must be deployed in Supabase
2. **Network Issues**: Connection problems between frontend and Supabase
3. **Environment Variables**: Missing or incorrect Supabase URL/keys
4. **CORS Issues**: Function not properly handling CORS (now fixed)

## How to Verify the Fix

### Step 1: Redeploy the Edge Function

The Edge Function code has been updated. You need to redeploy it:

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find the `send-email` function (or create it if it doesn't exist)
3. Copy the code from `supabase/functions/send-email/index.ts`
4. Paste it into the function editor
5. Click **Deploy**

### Step 2: Test the Function

You can test the function directly from the Supabase Dashboard:

1. Go to **Edge Functions** → `send-email`
2. Click **Invoke** or **Test**
3. Use a GET request to test the health check endpoint
4. You should see: `{"success": true, "message": "cPanel SMTP Email Function is running", ...}`

### Step 3: Check Environment Variables

Ensure your frontend has the correct environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 4: Verify SMTP Configuration

The function needs SMTP settings in the database:

1. Go to **Admin Settings** → **System Settings** → **Email Configuration**
2. Configure:
   - SMTP Host
   - SMTP Port (587 for TLS, 465 for SSL)
   - SMTP Username
   - SMTP Password
   - From Email
   - From Name

## Testing from Frontend

Try sending an invoice email again. The error messages are now more descriptive and will tell you exactly what's wrong:

- If function not deployed: Clear instructions to deploy
- If SMTP not configured: Instructions to configure in Admin Settings
- If network error: Suggestions to check connection

## Troubleshooting

### Still Getting "Failed to send a request"?

1. **Check Function Deployment**
   ```bash
   # Verify function exists in Supabase Dashboard
   ```

2. **Check Network Tab**
   - Open browser DevTools → Network tab
   - Try sending an email
   - Look for the request to `functions/v1/send-email`
   - Check the response status and error message

3. **Verify Supabase Connection**
   - Make sure your app can connect to Supabase
   - Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

4. **Check Function Logs**
   - Go to Supabase Dashboard → Edge Functions → `send-email` → Logs
   - Look for any error messages when the function is invoked

## What Changed in the Code

### Edge Function (`supabase/functions/send-email/index.ts`)
- ✅ Improved CORS headers (added methods)
- ✅ Better JSON parsing with detailed error messages
- ✅ Enhanced SMTP import error handling
- ✅ More detailed error messages for all failure scenarios
- ✅ Better logging for debugging

### Email Service (`src/services/email.service.ts`)
- ✅ Enhanced error handling with `.catch()` for invocation errors
- ✅ More descriptive error messages with step-by-step instructions
- ✅ Better handling of network errors
- ✅ Improved debugging information

## Next Steps

1. **Redeploy** the Edge Function (most important!)
2. **Test** the function with a simple GET request
3. **Configure** SMTP settings if not already done
4. **Try** sending an invoice email again

The function should now work correctly and provide helpful error messages if something is still misconfigured.

