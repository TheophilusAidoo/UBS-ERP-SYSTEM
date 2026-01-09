# Fix Companies RLS and Storage Issues

## IMPORTANT: Run This SQL Script in Supabase

You **MUST** run the SQL script in your Supabase SQL Editor to fix both issues:

1. **Company creation RLS error**
2. **Images not showing in Supabase Storage**

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to your Supabase project
- Click on "SQL Editor" in the left sidebar

### 2. Run the SQL Script
- Open the file: `database/fix-companies-and-storage.sql`
- Copy the **ENTIRE** contents
- Paste it into the Supabase SQL Editor
- Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### 3. Verify the Fix
After running the script:
- Try creating a company - it should work without RLS errors
- Try uploading a company logo - it should upload and display correctly

## What the Script Does:

1. **Fixes Companies RLS Policies:**
   - Creates `is_admin()` function to avoid recursion
   - Adds proper INSERT policy for admins (this fixes the "new row violates row-level security policy" error)
   - Adds SELECT, UPDATE, DELETE policies for admins
   - Adds SELECT policy for staff to view their own company

2. **Fixes Storage Bucket:**
   - Creates/updates the `company-assets` bucket
   - Makes the bucket **public** so images can be accessed
   - Sets up proper RLS policies for storage
   - Allows authenticated users to upload/update/delete logos

## If Images Still Don't Show:

1. **Check the bucket exists:**
   - Go to Supabase Dashboard → Storage
   - Verify `company-assets` bucket exists
   - Make sure it's marked as **Public**

2. **Check the URL:**
   - The logo URL should be in format: `https://[your-project].supabase.co/storage/v1/object/public/company-assets/company-logos/[filename]`
   - Open the URL directly in a browser to test

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Check for any CORS or 403 errors when loading images

## If You Get "Failed to upload logo: new row violates row-level security policy":

This means the storage bucket RLS policies need to be updated. The SQL script has been updated to fix this. Make sure you:

1. **Re-run the SQL script** - The storage policies have been updated to allow authenticated users to upload
2. **Check you're logged in** - Make sure you're logged in as an admin user
3. **Verify the bucket policies** - Go to Supabase Dashboard → Storage → `company-assets` → Policies
   - You should see policies for SELECT, INSERT, UPDATE, DELETE
   - The INSERT policy should allow authenticated users (`auth.uid() IS NOT NULL`)

## Need Help?

If you still have issues after running the SQL script, check:
- You're logged in as an admin user
- The `is_admin()` function was created successfully
- The storage bucket `company-assets` exists and is public
- Your Supabase project URL is correct in `.env` file
- The storage policies allow INSERT for authenticated users

