# 🚀 Quick Database Setup Guide

## ⚠️ IMPORTANT: Run Schema First!

You **MUST** run `database/schema.sql` before running any other SQL scripts.

## Step-by-Step Instructions

### 1️⃣ Run the Database Schema

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `shejpknspmrlgbjhhptx`

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query** button

3. **Copy and Run Schema**
   - Open the file: `database/schema.sql` in your project
   - Copy **ALL** the contents (Ctrl/Cmd + A, then Ctrl/Cmd + C)
   - Paste into the SQL Editor (Ctrl/Cmd + V)
   - Click **Run** button (or press Ctrl/Cmd + Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check the **Table Editor** in the left sidebar
   - You should see these tables:
     - ✅ companies
     - ✅ users
     - ✅ attendance
     - ✅ leave_requests
     - ✅ transactions
     - ✅ invoices
     - ✅ invoice_items
     - ✅ proposals
     - ✅ proposal_items
     - ✅ projects
     - ✅ project_assignments
     - ✅ work_reports
     - ✅ messages
     - ✅ notifications
     - ✅ kpis
     - ✅ goals
     - ✅ performance_reviews
     - ✅ ai_insights
     - ✅ audit_logs

### 2️⃣ Create Test Users (Optional)

**Option A: Use Quick Login (Easiest)**
- Just use the "👤 Admin" or "👨‍💼 Staff" buttons on the login page
- The app will auto-create accounts if they don't exist

**Option B: Manual Setup via SQL**
1. First, create users in **Authentication > Users**:
   - Click "Add User" → "Create new user"
   - Email: `admin@ubs.com`, Password: `test123`
   - Email: `staff@ubs.com`, Password: `test123`

2. Then run `database/test-users.sql` in SQL Editor

## ✅ Verification Checklist

- [ ] Schema.sql has been run successfully
- [ ] All tables are visible in Table Editor
- [ ] Quick login buttons work on the login page
- [ ] Can log in as admin or staff

## 🐛 Troubleshooting

### Error: "relation 'companies' does not exist"
**Solution:** You haven't run `schema.sql` yet. Follow Step 1 above.

### Error: "relation 'users' does not exist"
**Solution:** Run `schema.sql` first. It creates all tables.

### Quick login doesn't work
**Solution:** 
1. Make sure schema.sql has been run
2. Check that `.env` file has correct Supabase credentials
3. Restart your dev server: `npm run dev`

## 📝 Next Steps

After setting up the database:
1. ✅ Restart your dev server: `npm run dev`
2. ✅ Go to http://localhost:3002/login
3. ✅ Click "👤 Admin" or "👨‍💼 Staff" to test login


