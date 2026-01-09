# Deploy Fixed Edge Function - Fixes "non-2xx status code" Error

## ✅ The Fix

I've updated the Edge Function to **ALWAYS return status 200**, even on errors. This prevents the "non-2xx status code" error.

All errors are now returned in the response body with `success: false` and an `error` field.

---

## 🚀 Deploy the Fixed Function

### Step 1: Copy the Fixed Code

1. **Open the file:**
   - `supabase/functions/send-email/index.ts`

2. **Copy ALL contents:**
   - Select all (Cmd+A / Ctrl+A)
   - Copy (Cmd+C / Ctrl+C)

### Step 2: Update in Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
   - Click **"Edge Functions"** → **"send-email"**

2. **Replace the code:**
   - **Delete** all existing code in the editor
   - **Paste** the updated code you copied
   - Click **"Save"**

3. **Deploy:**
   - Click **"Deploy"** button
   - Wait for "Function deployed successfully" ✅

---

## ✅ Step 3: Test Again

1. **Go to Admin Settings:**
   - Settings → System Settings → Email Configuration

2. **Make sure all fields are filled:**
   - SMTP Host
   - SMTP Port
   - SMTP Username
   - SMTP Password
   - From Email
   - From Name

3. **Click "Send Test Email"**

4. **You should now see:**
   - ✅ Either: "Test email sent successfully!"
   - ✅ Or: A specific error message (not "non-2xx status code")

---

## 🔍 What Changed

- **Before:** Function returned 400/500 status codes → Supabase treated as error → "non-2xx status code"
- **After:** Function ALWAYS returns 200 → Errors in response body → Frontend can read and display them

---

## ⚠️ If You Still Get Errors

### Check Function Logs:
1. Supabase Dashboard → Edge Functions → send-email
2. Click **"Logs"** tab
3. Look for error messages when you click "Send Test Email"

### Common Issues:

**"SMTP configuration incomplete"**
- Fill in all SMTP fields in Admin Settings

**"Connection refused"**
- Check SMTP Host is correct
- Verify SMTP Port (587 or 465)

**"Authentication failed"**
- Double-check SMTP Username (full email)
- Verify SMTP Password is correct

---

## ✅ Success!

After deploying, the "non-2xx status code" error should be gone, and you'll see helpful error messages instead!


