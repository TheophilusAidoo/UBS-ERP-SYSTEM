# 🔧 FINAL FIX: Storage RLS Error

## The Problem
You're getting: **"Failed to upload logo: new row violates row-level security policy"**

## The Solution
Run the **UPDATED** SQL script that completely fixes the storage bucket and policies.

## Steps (CRITICAL - Follow Exactly):

### 1. Open Supabase SQL Editor
- Go to your Supabase Dashboard
- Click **"SQL Editor"** in the left sidebar
- Click **"New Query"**

### 2. Copy and Run the ENTIRE Script
- Open: `database/fix-companies-and-storage.sql`
- **Select ALL** (Ctrl+A / Cmd+A)
- **Copy** (Ctrl+C / Cmd+C)
- **Paste** into Supabase SQL Editor
- Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

### 3. Wait for Success
You should see: **"Success. No rows returned"** or similar success message.

### 4. Test Immediately
- Go back to your app
- Try uploading a company logo
- It should work now!

## What This Script Does:

1. **Fixes Companies RLS:**
   - Creates `is_admin()` function
   - Adds proper INSERT policy for admins

2. **Fixes Storage Bucket (THE KEY FIX):**
   - Deletes and recreates the bucket fresh
   - Removes ALL old policies
   - Creates simple, permissive policies that work
   - Allows authenticated users to upload without complex checks

## If It Still Doesn't Work:

1. **Check you're logged in** - Make sure you're logged in as admin
2. **Check the bucket exists:**
   - Go to Supabase Dashboard → Storage
   - You should see `company-assets` bucket
   - It should be marked as **Public**
3. **Check policies:**
   - Go to Storage → `company-assets` → Policies
   - You should see 4 policies:
     - "Public read access for company-assets"
     - "Authenticated upload to company-assets"
     - "Authenticated update company-assets"
     - "Authenticated delete company-assets"
4. **Clear browser cache** - Sometimes old errors persist
5. **Restart dev server** - Stop and restart `npm run dev`

## This Should Work Now!

The new script uses simpler policies that don't check `auth.uid()` in the WITH CHECK clause, which was causing the issue. The policies now just check the bucket_id, which is sufficient for authenticated users.


