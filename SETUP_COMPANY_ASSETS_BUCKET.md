# 🗂️ Company Assets Storage Bucket Setup

## ✅ Current Status

- ✅ **Server is running** on `http://localhost:3000`
- ✅ **Supabase connection is working** - All API calls are successful
- ✅ **Environment variables configured** - `.env` file is set up
- ⏳ **Storage bucket needs to be created** - Run the SQL script below

## 📋 Step-by-Step Setup

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Company Assets Bucket Script

1. Open the file: `database/create-company-assets-bucket.sql`
2. Copy **ALL** the contents (Ctrl/Cmd + A, then Ctrl/Cmd + C)
3. Paste into the SQL Editor (Ctrl/Cmd + V)
4. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 3: Verify the Bucket Was Created

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. You should see a bucket named `company-assets`
3. Verify it's set to **Public**

### Step 4: Test Logo Upload

1. In the app, navigate to **Companies** screen
2. Create or edit a company
3. Try uploading a company logo
4. The logo should upload successfully to the `company-assets` bucket

## 🔍 What This Script Does

The SQL script creates:

1. **Storage Bucket**: `company-assets`
   - Public bucket (images can be accessed via URL)
   - 5MB file size limit
   - Accepts: JPEG, JPG, PNG, GIF, WebP

2. **Storage Policies**:
   - ✅ Public read access (anyone can view logos)
   - ✅ Authenticated users can upload
   - ✅ Authenticated users can update
   - ✅ Authenticated users can delete

## 📝 SQL Script Location

The script is located at: `database/create-company-assets-bucket.sql`

## ✅ Verification Checklist

- [ ] SQL script has been run successfully
- [ ] `company-assets` bucket appears in Storage
- [ ] Bucket is set to Public
- [ ] Can upload company logos in the app
- [ ] Logos display correctly after upload

## 🐛 Troubleshooting

### "Bucket already exists" error
- This is fine! The script uses `ON CONFLICT DO NOTHING`
- Just verify the bucket exists in Storage

### "Permission denied" error
- Make sure you're logged into Supabase Dashboard
- Check that you have admin access to the project

### Logo upload fails
- Verify the bucket was created successfully
- Check browser console for specific error messages
- Ensure file is under 5MB and is an image format

## 🎯 Next Steps After Setup

Once the bucket is created:
1. ✅ Company logo uploads will work automatically
2. ✅ Logos will be stored in Supabase Storage
3. ✅ Logos will be accessible via public URLs
4. ✅ The app will handle uploads/deletes automatically

---

**Note**: The server is already running and connected to Supabase. You just need to run the SQL script to create the storage bucket!

