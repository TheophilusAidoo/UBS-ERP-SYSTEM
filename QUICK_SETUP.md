# 🚀 Quick Setup Guide

## ✅ Step 1: Environment Variables (DONE)
Run this command in your terminal:
```bash
./setup-env.sh
```

Or manually create `.env` file with:
```
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo
VITE_OPENAI_API_KEY=
```

## 📋 Step 2: Database Schema Setup

### Go to Supabase Dashboard:
1. Visit: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy ALL content from `database/schema.sql`
5. Paste into SQL Editor
6. Click **Run** (or Ctrl/Cmd + Enter)

### Verify Tables Created:
After running, you should see these tables:
- companies
- users  
- attendance
- leave_requests
- transactions
- invoices
- projects
- messages
- notifications
- goals
- performance_reviews

## 🔐 Step 3: Enable Authentication

1. In Supabase Dashboard, go to **Authentication** > **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** > **Settings**
4. For testing, disable **"Confirm email"** (optional, for easier testing)

## 🚀 Step 4: Start the App

```bash
npm run dev
```

## 🎯 Step 5: Test Login

1. Open http://localhost:3000
2. Click **"Admin"** button for quick login
3. The app will auto-create the test account if it doesn't exist
4. You should see the Admin Dashboard!

## 📝 Test Credentials (Auto-created)

- **Admin**: `admin@ubs.com` / `test123`
- **Staff**: `staff@ubs.com` / `test123`

## ⚠️ Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists
- Restart dev server: `npm run dev`

### "User profile not found"
- Make sure you ran `database/schema.sql`
- Check Supabase SQL Editor for errors

### "Invalid credentials"
- Use Quick Login buttons (they auto-create accounts)
- Or check browser console for detailed errors

## ✅ Checklist

- [ ] `.env` file created
- [ ] Database schema run in Supabase
- [ ] Authentication enabled
- [ ] Dev server running
- [ ] Can login and see dashboard


