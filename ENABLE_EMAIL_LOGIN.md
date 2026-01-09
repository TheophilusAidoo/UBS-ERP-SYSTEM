# 🔧 Enable Email Logins in Supabase

## Problem
You're getting the error: **"Email logins are disabled"** or **"Email provider is disabled"**

This means that email/password authentication has been disabled in your Supabase project settings.

## ✅ Solution: Enable Email Authentication Provider

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project (or sign in if needed)

### Step 2: Navigate to Authentication Settings

1. In the left sidebar, click **"Authentication"**
2. Click **"Providers"** (or go directly to: Authentication > Providers)

### Step 3: Enable Email Provider

1. Find **"Email"** in the list of providers
2. You should see a toggle switch next to it
3. **Toggle it ON** (should be green/enabled)
4. **Save** the changes (usually auto-saves or click "Save" button)

### Step 4: Verify Settings

Make sure these settings are configured:

- ✅ **Email Provider:** Enabled (toggle ON)
- ✅ **Enable email confirmations:** Can be disabled for testing (or enabled for production)
- ✅ **Secure email change:** Can be enabled or disabled (your choice)

### Step 5: Test Login

1. Go back to your app login page
2. Try logging in with your credentials again
3. It should work now!

---

## 🔍 Additional Configuration (Optional)

### Recommended Settings for Testing:

1. **Go to:** Authentication > Settings
2. **Email Confirmations:**
   - For testing: Set to **"Off"** (allows immediate login)
   - For production: Set to **"On"** (requires email verification)

3. **Enable email confirmations:** Toggle OFF for immediate login during development

### Recommended Settings for Production:

1. **Enable email confirmations:** Toggle ON
2. **Secure email change:** Toggle ON
3. **Rate limiting:** Leave at defaults (prevents brute force attacks)

---

## 🐛 Troubleshooting

### "Email provider" section not visible
- Make sure you're in the correct project
- Try refreshing the page
- Check if you have admin access to the project

### Settings don't save
- Try refreshing the page and checking again
- Make sure you have proper permissions
- Try logging out and back into Supabase Dashboard

### Still getting errors after enabling
1. **Clear browser cache** and try again
2. **Wait 10-30 seconds** for changes to propagate
3. **Restart your dev server**: `npm run dev`
4. **Check Supabase status page**: https://status.supabase.com

### Need to create users manually
If auto-registration isn't working:

1. Go to: Authentication > Users
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - **Email:** `admin@ubs.com`
   - **Password:** `test123` (or your preferred password)
   - ✅ Check **"Auto Confirm User"**
4. Click **"Create User"**

---

## 📝 Quick Checklist

- [ ] Opened Supabase Dashboard
- [ ] Went to Authentication > Providers
- [ ] Enabled Email provider (toggle ON)
- [ ] Saved changes
- [ ] Waited 10-30 seconds
- [ ] Tried logging in again
- [ ] ✅ Login works!

---

## 🆘 Still Need Help?

If you're still having issues:

1. **Check Supabase documentation:**
   - https://supabase.com/docs/guides/auth/auth-email

2. **Verify your project settings:**
   - Make sure you're using the correct project
   - Check that your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for any error messages
   - Share the error with support

---

## ✅ Success!

Once email provider is enabled, you should be able to:
- ✅ Log in with email and password
- ✅ Register new users
- ✅ Reset passwords
- ✅ Use all authentication features

**That's it! Email logins should now work!** 🎉
