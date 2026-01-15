# Supabase Setup Instructions

## ✅ Environment Variables
The `.env` file has been created with your Supabase credentials.

## 📋 Database Schema Setup

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `shejpknspmrlgbjhhptx`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Schema
1. Copy the entire contents of `database/schema.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 3: Verify Tables Created
After running the schema, verify these tables exist:
- ✅ companies
- ✅ users
- ✅ attendance
- ✅ leave_requests
- ✅ transactions
- ✅ invoices
- ✅ projects
- ✅ messages
- ✅ notifications
- ✅ goals
- ✅ performance_reviews

## 🔐 Authentication Setup

### Enable Email Provider
1. Go to **Authentication** > **Providers** in Supabase Dashboard
2. Make sure **Email** provider is enabled
3. For testing, you can disable "Confirm email" in **Authentication** > **Settings**

## 👤 Create Test Users

### Option 1: Use Quick Login (Recommended)
- The app has quick login buttons that will auto-create test accounts
- Just click "Admin" or "Staff" on the login screen

### Option 2: Manual Creation via SQL
Run this in SQL Editor after creating auth users:

```sql
-- First create a test company
INSERT INTO companies (name, email, is_active)
VALUES ('UBS Test Company', 'test@ubs.com', true)
ON CONFLICT DO NOTHING;

-- Then create user profiles (after creating auth users in Authentication > Users)
-- Replace 'admin@ubs.com' with the email you used in Authentication
INSERT INTO users (id, email, role, first_name, last_name)
SELECT 
  id, 
  'admin@ubs.com', 
  'admin',
  'Admin',
  'User'
FROM auth.users 
WHERE email = 'admin@ubs.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', first_name = 'Admin', last_name = 'User';
```

## 🚀 Next Steps

1. ✅ Environment variables are set
2. ⏳ Run the database schema (see Step 2 above)
3. ⏳ Restart your dev server: `npm run dev`
4. ⏳ Test the app with quick login buttons

## 🔍 Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists in the project root
- Restart the dev server after creating `.env`

### "User profile not found"
- Make sure you ran `database/schema.sql`
- Check that the `users` table exists

### "Invalid credentials"
- Use the Quick Login buttons in the app
- Or create users manually in Supabase Authentication


