# 🔍 Debug Instructions

## Current Situation

- ✅ GET request works (health check returns success)
- ✅ OPTIONS request works (CORS preflight)
- ❌ POST request shows "non-2xx status code" error
- ⚠️ Logs show OPTIONS but **NO POST request logs**

## What This Means

The POST request is either:
1. **Not reaching the function** - Network/routing issue
2. **Failing before logging** - Crashes immediately
3. **Being blocked** - CORS or authentication issue

## Steps to Debug

### Step 1: Check Browser Console

1. Open your browser's **Developer Tools** (F12)
2. Go to **Console** tab
3. Try sending test email
4. Look for logs starting with:
   - "Sending email request with payload:"
   - "Payload keys:"
   - "Function invoke completed"

### Step 2: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Try sending test email
3. Look for request to `functions/v1/send-email`
4. Click on it to see:
   - Request method (should be POST)
   - Request payload
   - Response status
   - Response body

### Step 3: Check Function Logs

1. Go to Supabase Dashboard → Edge Functions → `send-email` → **Logs**
2. **Filter by time** - Look for logs around when you tested
3. Look for:
   - `=== REQUEST RECEIVED ===`
   - `Method: POST`
   - Any error messages

### Step 4: Test with curl (Optional)

You can test the function directly:

```bash
curl -X POST https://shejpknspmrlgbjhhptx.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

Replace `YOUR_ANON_KEY` with your Supabase anon key.

## What to Share

If it still doesn't work, share:
1. **Browser Console logs** (screenshot or copy)
2. **Network tab** details (request/response)
3. **Function logs** from Supabase Dashboard
4. **Any error messages** you see

This will help identify exactly where it's failing!

