# 🔧 Clear Browser Storage to Fix Login Issues

## Problem
If you're seeing errors about user ID mismatches or login failures, it's likely because your browser has stored old authentication data.

## Quick Fix

### Option 1: Clear Storage via Browser Console (Fastest)

1. **Open Browser Console:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to **Console** tab

2. **Run this command:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Try logging in again**

### Option 2: Clear Storage Manually

1. **Open Browser DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **Go to Application Tab:**
   - Click **Application** (Chrome) or **Storage** (Firefox)

3. **Clear Local Storage:**
   - Expand **Local Storage**
   - Click on your site URL (e.g., `http://localhost:3002`)
   - Click **Clear All** or delete the `ubs_erp_user` key

4. **Clear Session Storage:**
   - Expand **Session Storage**
   - Click on your site URL
   - Click **Clear All**

5. **Refresh the page:**
   - Press `F5` or `Cmd+R` / `Ctrl+R`

### Option 3: Use Incognito/Private Window

1. **Open a new incognito/private window:**
   - Chrome: `Cmd+Shift+N` (Mac) / `Ctrl+Shift+N` (Windows)
   - Firefox: `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows)
   - Safari: `Cmd+Shift+N` (Mac)

2. **Go to:** http://localhost:3002/login

3. **Log in with:**
   - Email: `admin@ubs.com`
   - Password: `test123`

## Why This Happens

- Browser stores authentication data in `localStorage`
- If you created a user with a different ID, the old data conflicts
- Clearing storage forces a fresh login

## After Clearing Storage

1. ✅ Go to login page
2. ✅ Enter credentials: `admin@ubs.com` / `test123`
3. ✅ Click Login
4. ✅ Should redirect to dashboard immediately

## Still Having Issues?

If clearing storage doesn't work:

1. **Verify user exists in Supabase:**
   - Go to Supabase Dashboard → Authentication → Users
   - Check that `admin@ubs.com` exists
   - Verify the password is `test123`

2. **Verify user profile exists:**
   - Run the SQL query from `VERIFY_USER_ID.md`
   - Make sure IDs match

3. **Check browser console for errors:**
   - Look for any red error messages
   - Share them if you need help


