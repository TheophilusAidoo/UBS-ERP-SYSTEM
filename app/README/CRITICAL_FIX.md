# 🚨 CRITICAL FIX - READ THIS

## The Problem
If you're getting "non-2xx status code", it means the function is crashing BEFORE it can return a response.

## The Solution

### Step 1: Delete the old function
1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx/functions
2. Find "send-email"
3. Click the 3 dots menu → **Delete** (or rename it to backup)
4. Confirm deletion

### Step 2: Create NEW function
1. Click **"Create a new function"** or **"New Function"**
2. Name it: `send-email` (exactly this name)
3. Copy ALL code from `supabase/functions/send-email/index.ts`
4. Paste it
5. Click **Deploy**
6. Wait 30-60 seconds

### Step 3: Test
1. Go to your admin app
2. Settings → Email Configuration
3. Fill in your SMTP settings (from stockmartllc.com)
4. Save
5. Test email

## Why This Works
Creating a fresh function clears any cached errors or corrupted state that might be causing the crash.

## Still Not Working?
1. Check Supabase Dashboard → Functions → send-email → **Logs**
2. Look for red error messages
3. Share the exact error with me

