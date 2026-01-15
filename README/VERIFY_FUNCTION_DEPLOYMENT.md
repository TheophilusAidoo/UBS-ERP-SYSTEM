# Verify Edge Function Deployment

## 🔍 Check if Function is Deployed

### Step 1: Verify in Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
   - Click **"Edge Functions"** in left sidebar

2. **Check if function exists:**
   - You should see **"send-email"** in the list
   - Status should be **"Active"** or show a green checkmark
   - If you don't see it, the function is NOT deployed

### Step 2: Test Function Directly

1. **In Supabase Dashboard:**
   - Click on **"send-email"** function
   - Click **"Invoke"** tab
   - Try invoking with test data:
   ```json
   {
     "to": "your-email@example.com",
     "subject": "Test",
     "html": "<h1>Test</h1>"
   }
   ```
   - Check the response

### Step 3: Check Function Logs

1. **In Supabase Dashboard:**
   - Click on **"send-email"** function
   - Click **"Logs"** tab
   - Look for any errors when you try to send email

---

## ✅ If Function is NOT Deployed

### Deploy Now:

1. **Create Function:**
   - Edge Functions → **"Create a new function"**
   - Name: `send-email` (exactly this name, lowercase with hyphen)
   - Click **"Create function"**

2. **Add Code:**
   - Open `supabase/functions/send-email/index.ts`
   - Copy ALL contents
   - Paste into Supabase editor
   - Click **"Save"**

3. **Deploy:**
   - Click **"Deploy"** button
   - Wait for success ✅

---

## ⚠️ Common Issues

### "Function not found"
- Function name must be exactly: `send-email`
- Check spelling (lowercase, hyphen, not underscore)

### "Failed to send a request"
- Function might not be deployed
- Check Supabase Dashboard → Edge Functions
- Verify function is listed and active

### Network errors
- Check internet connection
- Verify Supabase project is active
- Check browser console for details

---

## 🧪 Test After Deployment

1. **Go to Admin Settings:**
   - Settings → System Settings → Email Configuration
   - Fill in SMTP settings
   - Click "Send Test Email"

2. **Check Function Logs:**
   - Supabase Dashboard → Edge Functions → send-email → Logs
   - Look for any errors

---

## ✅ Success Indicators

- ✅ Function appears in Edge Functions list
- ✅ Function status is "Active"
- ✅ Test email sends successfully
- ✅ No errors in function logs


