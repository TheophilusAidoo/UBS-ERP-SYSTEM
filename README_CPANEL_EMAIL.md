# cPanel Email Configuration - Admin Dashboard

## 🎯 Overview

Your UBS ERP system uses **ONLY cPanel SMTP** for sending emails. No 3rd party services (Resend, SendGrid, etc.) are used or required.

All email configuration is done from the **Admin Dashboard** - no code changes needed!

---

## ⚙️ Configure Email Settings

### Step 1: Login as Admin
1. Login to your UBS ERP system
2. Go to **Settings** → **System Settings** tab
3. Scroll to **"cPanel Email Configuration"**

### Step 2: Enter Your cPanel SMTP Details

Fill in these fields with your cPanel email information:

| Field | Example | Description |
|-------|---------|-------------|
| **SMTP Host** | `mail.yourdomain.com` | Your cPanel SMTP server (usually `mail.yourdomain.com`) |
| **SMTP Port** | `587` | Port 587 for TLS (recommended) or 465 for SSL |
| **SMTP Username** | `noreply@yourdomain.com` | Your full cPanel email address |
| **SMTP Password** | `[your password]` | Password for the email account |
| **Connection Security** | `TLS` | TLS (port 587) or SSL (port 465) |
| **From Email** | `noreply@yourdomain.com` | Email address that appears as sender |
| **From Name** | `UBS ERP System` | Name that appears as sender |

### Step 3: Save & Test
1. Click **"Save Email Settings"**
2. Click **"Send Test Email"** to verify it works
3. Check your email inbox for the test email

---

## 📋 Finding Your cPanel SMTP Settings

### In cPanel Dashboard:

1. **Login to cPanel**
2. Go to **Email Accounts**
3. Click **"Connect Devices"** or **"Configure Email Client"** next to your email
4. Look for **"Outgoing Server"** settings:
   - **Server:** Usually `mail.yourdomain.com` or `smtp.yourdomain.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Security:** TLS or SSL
   - **Username:** Your full email address
   - **Password:** Your email password

---

## ✅ Common cPanel SMTP Settings

### Standard Configuration (Most Common):
```
SMTP Host: mail.yourdomain.com
SMTP Port: 587
Connection Security: TLS
SMTP Username: your-email@yourdomain.com
SMTP Password: [your email password]
From Email: your-email@yourdomain.com
From Name: UBS ERP System
```

### Alternative (If TLS doesn't work):
```
SMTP Host: smtp.yourdomain.com
SMTP Port: 465
Connection Security: SSL
SMTP Username: your-email@yourdomain.com
SMTP Password: [your email password]
From Email: your-email@yourdomain.com
From Name: UBS ERP System
```

---

## 🚀 Deploy Edge Function

After configuring settings, make sure the Edge Function is deployed:

### Via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Click **"Edge Functions"** → **"Create a new function"**
3. Name: `send-email`
4. Copy code from: `supabase/functions/send-email/index.ts`
5. Add CORS file: `supabase/functions/_shared/cors.ts`
6. Click **"Deploy"**

See `START_HERE_DEPLOY_EMAIL.md` for detailed deployment steps.

---

## 🧪 Testing

### Test Email:
1. Go to Admin Settings → Email Configuration
2. Click **"Send Test Email"**
3. Check your inbox

### Test with Invoice:
1. Create an invoice
2. Click **"Send Invoice"**
3. Check recipient's email inbox

---

## ⚠️ Troubleshooting

### "SMTP configuration incomplete"
- Make sure all required fields are filled (*)
- Check SMTP Host, Username, Password, and From Email

### "SMTP error: Connection refused"
- Verify SMTP Host is correct (`mail.yourdomain.com`)
- Check SMTP Port (587 for TLS, 465 for SSL)
- Ensure cPanel allows SMTP connections

### "SMTP error: Authentication failed"
- Double-check SMTP Username (must be full email address)
- Verify SMTP Password is correct
- Ensure email account exists in cPanel

### "SMTP error: Timeout"
- Check if hosting provider blocks SMTP ports
- Try port 465 (SSL) instead of 587 (TLS)
- Contact hosting provider if issues persist

---

## 🔒 Security

- SMTP Password is stored securely in the database
- Settings are encrypted in `global_settings` table
- Only Admins can access email configuration

---

## 📝 Notes

- **No 3rd Party Services:** System uses ONLY your cPanel email
- **All Configuration in Admin Dashboard:** No code changes needed
- **Direct SMTP Connection:** Emails sent directly through your server
- **PDF Attachments Supported:** Invoices sent with PDF attachments

---

## 🎉 Success!

Once configured, all invoices and reports will be sent using your cPanel email server - completely independent, no external services!


