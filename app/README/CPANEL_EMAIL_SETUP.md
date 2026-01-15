# cPanel Email Setup Guide - cPanel SMTP ONLY

## ✅ Complete Setup for cPanel SMTP Email

Your system is configured to use **ONLY** your cPanel email - no 3rd party services! Everything can be configured from the Admin Dashboard.

---

## 🎯 Step 1: Configure Email Settings in Admin Dashboard

1. **Login as Admin**
2. Go to: **Settings** → **System Settings** tab
3. Scroll to: **"Email Configuration"**

### Fill in Your cPanel SMTP Details:

```
Email Provider: cPanel SMTP (Your Server)

SMTP Host: mail.yourdomain.com
           (or smtp.yourdomain.com - check your cPanel)

SMTP Port: 587 (for TLS) or 465 (for SSL)
          (587 is recommended - TLS)

SMTP Username: your-email@yourdomain.com
               (The email address you created in cPanel)

SMTP Password: [Your email password from cPanel]

Connection Security: TLS (Port 587)
                    (or SSL if TLS doesn't work)

From Email: your-email@yourdomain.com
            (Same as SMTP Username)

From Name: UBS ERP System
           (Or your company name)
```

4. Click **"Save Email Settings"**
5. Click **"Send Test Email"** to verify it works!

---

## 📋 Finding Your cPanel SMTP Settings

### In cPanel:

1. **SMTP Host:**
   - Usually: `mail.yourdomain.com`
   - Or: `smtp.yourdomain.com`
   - Check: cPanel → Email Accounts → Connect Devices

2. **SMTP Port:**
   - **587** for TLS (Recommended)
   - **465** for SSL
   - **25** for non-encrypted (not recommended)

3. **SMTP Username:**
   - Your full email address: `your-email@yourdomain.com`

4. **SMTP Password:**
   - The password you set when creating the email account in cPanel

---

## ✅ Step 2: Deploy Edge Function

The Edge Function needs to be deployed to Supabase:

### Option A: Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Click **"Edge Functions"** → **"Create a new function"**
3. Name: `send-email`
4. Copy code from: `supabase/functions/send-email/index.ts`
5. Add CORS file: `supabase/functions/_shared/cors.ts`
6. Click **"Deploy"**

See `START_HERE_DEPLOY_EMAIL.md` for detailed steps.

---

## 🧪 Testing

1. **Test Email:**
   - Go to Admin Settings → Email Configuration
   - Click **"Send Test Email"**
   - Check your inbox

2. **Test with Invoice:**
   - Create an invoice
   - Click **"Send Invoice"**
   - Check recipient's email inbox

---

## ⚠️ Troubleshooting

### "SMTP configuration incomplete"
- Make sure all SMTP fields are filled in
- Check that SMTP Host, Username, Password, and From Email are set

### "SMTP error: Connection refused"
- Check SMTP Host is correct (usually `mail.yourdomain.com`)
- Verify SMTP Port (587 for TLS, 465 for SSL)
- Make sure your cPanel allows SMTP connections

### "SMTP error: Authentication failed"
- Double-check SMTP Username (full email address)
- Verify SMTP Password is correct
- Make sure the email account exists in cPanel

### "SMTP error: Timeout"
- Check if your hosting provider blocks SMTP ports
- Try port 465 (SSL) instead of 587 (TLS)
- Contact your hosting provider if issues persist

### Email not sending
- Check Edge Function logs in Supabase Dashboard
- Verify email settings are saved in Admin Settings
- Make sure Edge Function is deployed

---

## 🔒 Security Notes

- **SMTP Password is encrypted** in the database
- Settings are stored securely in `global_settings` table
- Only Admins can access email configuration

---

## 📝 Common cPanel SMTP Settings

### Standard cPanel Setup:
```
Host: mail.yourdomain.com
Port: 587
Security: TLS
Username: your-email@yourdomain.com
Password: [Your email password]
```

### Alternative (if above doesn't work):
```
Host: smtp.yourdomain.com
Port: 465
Security: SSL
Username: your-email@yourdomain.com
Password: [Your email password]
```

---

## 🎉 Success!

Once configured, all invoices and reports will be sent using your cPanel email server - no 3rd party services needed!

Everything is managed from the Admin Dashboard - no code changes required.

