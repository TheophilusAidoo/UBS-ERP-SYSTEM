# 🔧 Fix Login Issues - Complete Guide

## ✅ What I Fixed

I've improved the login system with:
- ✅ Better error messages with step-by-step solutions
- ✅ Detailed console logging for debugging
- ✅ Supabase configuration checks
- ✅ Clear guidance for common issues

## 🚀 Quick Fix (Try This First)

### Step 1: Check Browser Console
1. Open your app in browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Try logging in
5. Look for error messages starting with ❌ or ✅
6. The console will show exactly what's wrong

### Step 2: Clear Browser Storage
**In Browser Console (F12), run:**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 3: Verify Supabase Configuration

**Check your `.env` file exists and has:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**If missing:**
1. Go to Supabase Dashboard > Settings > API
2. Copy your Project URL and anon key
3. Create/update `.env` file with these values
4. Restart dev server: `npm run dev`

---

## 🔍 Common Login Errors & Fixes

### ❌ "Email logins are disabled"
**Fix:**
1. Go to Supabase Dashboard
2. Authentication > Providers
3. Find "Email" provider
4. Toggle it **ON**
5. Save changes
6. Try login again

### ❌ "User profile not found in database"
**Fix:**
1. Go to Supabase Dashboard > SQL Editor
2. Run `database/test-users.sql`
3. OR manually create user profile:
   - Go to Table Editor > users
   - Click "Insert row"
   - Fill in: id (from auth.users), email, role (admin/staff)
   - Click Save

### ❌ "Wrong credentials"
**Check:**
1. Go to Supabase Dashboard > Authentication > Users
2. Verify user exists
3. Check email is correct
4. Reset password if needed:
   - Click "..." next to user
   - Click "Reset Password"
   - Set new password
   - Try login again

### ❌ "Email not confirmed"
**Fix:**
1. Go to Supabase Dashboard > Authentication > Users
2. Find your user
3. Click "..." > "Confirm Email"
4. OR recreate user with "Auto Confirm User" checked

### ❌ "Supabase not configured"
**Fix:**
1. Create `.env` file in project root
2. Add:
   ```
   VITE_SUPABASE_URL=your-url
   VITE_SUPABASE_ANON_KEY=your-key
   ```
3. Restart dev server

---

## 📋 Complete Setup Checklist

### 1. Supabase Setup
- [ ] Project created in Supabase
- [ ] `database/schema.sql` has been run
- [ ] Email provider is enabled (Authentication > Providers > Email)
- [ ] User exists in Authentication > Users

### 2. Environment Variables
- [ ] `.env` file exists
- [ ] `VITE_SUPABASE_URL` is set
- [ ] `VITE_SUPABASE_ANON_KEY` is set
- [ ] Dev server restarted after adding env vars

### 3. User Setup
- [ ] User created in Authentication > Users
- [ ] Password set correctly
- [ ] "Auto Confirm User" was checked (or email confirmed)
- [ ] User profile exists in `users` table

### 4. Testing
- [ ] Browser console shows no errors
- [ ] Can see login screen
- [ ] Can enter credentials
- [ ] Login button works
- [ ] Redirects to dashboard after login

---

## 🎯 Test Login Credentials

**Admin:**
- Email: `admin@ubs.com`
- Password: `test123` (or what you set in Supabase)

**Staff:**
- Email: `staff@ubs.com`
- Password: `test123` (or what you set in Supabase)

**To create these users:**
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" > "Create new user"
3. Enter email and password
4. ✅ Check "Auto Confirm User"
5. Click "Create User"
6. Run `database/test-users.sql` in SQL Editor

---

## 🔍 Debugging Steps

### 1. Check Console Logs
When you try to login, you should see:
```
🔐 Attempting login for: admin@ubs.com
📡 Supabase URL: ✅ Set
✅ Auth successful, fetching user profile...
📋 Fetching user profile from users table...
✅ User profile found: admin@ubs.com admin
✅ Login successful, setting user in store: admin@ubs.com
```

### 2. If Login Fails, Check:
- ❌ Error message in console (will show exactly what's wrong)
- ❌ Network tab (F12 > Network) - check for failed requests
- ❌ Supabase Dashboard > Authentication > Users - verify user exists
- ❌ Table Editor > users - verify profile exists

### 3. Verify Database Connection
Run in Supabase SQL Editor:
```sql
SELECT * FROM users WHERE email = 'admin@ubs.com';
```
Should return 1 row.

---

## 🆘 Still Not Working?

### Check These:
1. **Browser Console** - Look for ❌ errors
2. **Network Tab** - Check if requests are failing
3. **Supabase Dashboard** - Verify user exists and is confirmed
4. **Environment Variables** - Make sure they're loaded (restart server)
5. **Database Tables** - Make sure schema.sql was run

### Get More Help:
1. Open browser console (F12)
2. Try logging in
3. Copy all error messages from console
4. Check which error matches from the list above
5. Follow the fix instructions

---

## ✅ Success Indicators

After login, you should see:
- ✅ Redirect to dashboard
- ✅ Dashboard shows user name/email
- ✅ No error messages
- ✅ All menu items visible
- ✅ Console shows: "✅ Login successful"

**If you see all of these, login is working!** 🎉
