# Fix "Failed to send a request to the Edge Function" Error

## 🔍 The Problem

You're getting: **"Failed to send a request to the Edge Function"**

This means the Edge Function `send-email` is either:
1. **Not deployed** to Supabase
2. **Deployed incorrectly**
3. **Has a runtime error**

---

## ✅ Solution: Deploy the Edge Function

### Step 1: Deploy via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
   - Login if needed

2. **Create Edge Function:**
   - Click **"Edge Functions"** in left sidebar
   - Click **"Create a new function"**
   - Name: `send-email` (exactly this name)
   - Click **"Create function"**

3. **Add Main Function Code:**
   - Open file: `supabase/functions/send-email/index.ts`
   - **Copy ALL** contents (Cmd+A, Cmd+C)
   - Go back to Supabase Dashboard
   - **Delete** all code in the editor
   - **Paste** the code you copied
   - Click **"Save"**

4. **Add CORS Helper File:**
   - Click **"Add file"** or **"+"** button
   - File path: `_shared/cors.ts`
   - Open file: `supabase/functions/_shared/cors.ts`
   - **Copy ALL** contents
   - **Paste** into the new file
   - Click **"Save"**

5. **Deploy:**
   - Click **"Deploy"** button (top right)
   - Wait for "Function deployed successfully" ✅

---

## ✅ Step 2: Configure cPanel SMTP Settings

After deploying, configure your email settings:

1. **Go to Admin Dashboard:**
   - Login as Admin
   - Go to **Settings** → **System Settings** tab
   - Scroll to **"cPanel Email Configuration"**

2. **Fill in Your cPanel SMTP Details:**
   ```
   SMTP Host: mail.yourdomain.com
   SMTP Port: 587
   SMTP Username: your-email@yourdomain.com
   SMTP Password: [your email password]
   Connection Security: TLS
   From Email: your-email@yourdomain.com
   From Name: UBS ERP System
   ```

3. **Save & Test:**
   - Click **"Save Email Settings"**
   - Click **"Send Test Email"**

---

## 🔍 Verify Deployment

### Check Function Exists:
1. Go to Supabase Dashboard → Edge Functions
2. You should see `send-email` function listed
3. Click on it to view the code

### Check Function Logs:
1. In Supabase Dashboard → Edge Functions
2. Click on `send-email` function
3. Click **"Logs"** tab
4. Look for any errors when sending emails

---

## ⚠️ Common Issues

### "Function not found" or "404"
- **Solution:** Function is not deployed. Follow Step 1 above to deploy it.

### "SMTP configuration incomplete"
- **Solution:** Configure SMTP settings in Admin Dashboard (Step 2 above)

### "Connection refused" or "Timeout"
- **Solution:** 
  - Check SMTP Host is correct (`mail.yourdomain.com`)
  - Verify SMTP Port (587 for TLS, 465 for SSL)
  - Try SSL (port 465) if TLS doesn't work

### "Authentication failed"
- **Solution:**
  - Double-check SMTP Username (full email address)
  - Verify SMTP Password is correct
  - Make sure email account exists in cPanel

---

## 📝 Quick Checklist

- [ ] Edge Function `send-email` is deployed in Supabase
- [ ] CORS file `_shared/cors.ts` is added
- [ ] SMTP settings configured in Admin Dashboard
- [ ] SMTP Host, Port, Username, Password all filled in
- [ ] Test email sent successfully

---

## 🎯 After Deployment

Once deployed and configured:
1. ✅ Edge Function will be available
2. ✅ Emails will send via cPanel SMTP
3. ✅ PDF attachments will work
4. ✅ All configuration from Admin Dashboard

---

## 🆘 Still Having Issues?

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for error messages
   - Check Network tab for failed requests

2. **Check Supabase Logs:**
   - Dashboard → Edge Functions → send-email → Logs
   - Look for error messages

3. **Verify Settings:**
   - Make sure all SMTP fields are filled in Admin Settings
   - Verify cPanel email account exists and password is correct

---

## ✅ Success!

Once deployed, the error will be gone and emails will send via your cPanel SMTP server!


