# 🔐 UBS ERP Login Credentials

## 📋 Admin & Staff Login Information

### Admin Login
- **Email:** `admin@ubs.com`
- **Password:** `test123`
- **Role:** Admin (Full Access)

### Staff Login
- **Email:** `staff@ubs.com`
- **Password:** `test123`
- **Role:** Staff (Company-specific access)

---

## 🚀 Quick Setup (3 Methods)

### Method 1: Quick Login Buttons (Easiest) ⭐

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Go to:** http://localhost:3002/login

3. **Click the buttons:**
   - Click **"👤 Admin"** button for admin login
   - Click **"👨‍💼 Staff"** button for staff login

4. **The app will automatically:**
   - Create the accounts if they don't exist
   - Log you in immediately
   - Take you to the dashboard

**Note:** This method requires the database schema to be set up first.

---

### Method 2: Manual Creation in Supabase (Recommended for Production)

#### Step 1: Create Users in Supabase Authentication

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project: `shejpknspmrlgbjhhptx`

2. **Navigate to Authentication:**
   - Click **Authentication** in the left sidebar
   - Click **Users**

3. **Create Admin User:**
   - Click **"Add User"** → **"Create new user"**
   - **Email:** `admin@ubs.com`
   - **Password:** `test123`
   - ✅ Check **"Auto Confirm User"** (to skip email verification)
   - Click **"Create User"**

4. **Create Staff User:**
   - Click **"Add User"** → **"Create new user"**
   - **Email:** `staff@ubs.com`
   - **Password:** `test123`
   - ✅ Check **"Auto Confirm User"**
   - Click **"Create User"**

#### Step 2: Create User Profiles in Database

1. **Go to SQL Editor:**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run the test users script:**
   - Open `database/test-users.sql` in your project
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify users:**
   - The script will show you the created users
   - You should see both admin and staff users

#### Step 3: Login

1. **Go to:** http://localhost:3002/login
2. **Enter credentials:**
   - Admin: `admin@ubs.com` / `test123`
   - Staff: `staff@ubs.com` / `test123`

---

### Method 3: Use Registration Screen

1. **Go to:** http://localhost:3002/login
2. **Click:** "Don't have an account? Register"
3. **Fill in the form:**
   - Select **Admin** or **Staff** role
   - Enter email, password, name, etc.
   - Click **Register**

**Note:** For Staff, you may need to assign a company after registration (via Admin dashboard).

---

## ✅ Verification Checklist

- [ ] Database schema has been run (`database/schema.sql`)
- [ ] Users created in Supabase Authentication
- [ ] User profiles created in database (via `test-users.sql` or registration)
- [ ] Can log in with credentials above
- [ ] Admin dashboard shows correctly
- [ ] Staff dashboard shows correctly

---

## 🔧 Troubleshooting

### "Invalid login credentials"
- **Solution:** Make sure users exist in Supabase Authentication
- Go to Authentication > Users and verify the emails exist

### "User profile not found"
- **Solution:** Run `database/test-users.sql` in SQL Editor
- Or use the registration screen to create profiles

### Quick login buttons don't work
- **Solution:** 
  1. Make sure `database/schema.sql` has been run
  2. Check that `.env` file has correct Supabase credentials
  3. Restart dev server: `npm run dev`

### "Email not confirmed"
- **Solution:** 
   - In Supabase Dashboard → Authentication → Settings
   - Disable "Confirm email" for testing
   - Or check "Auto Confirm User" when creating users

---

## 📝 Important Notes

1. **For Production:** Change these default passwords!
2. **Security:** These are test credentials. Use strong passwords in production.
3. **Email Verification:** Disabled for testing. Enable in production.
4. **Database:** Make sure `database/schema.sql` is run before creating users.

---

## 🎯 What You Can Do After Login

### As Admin:
- View dashboard with all statistics
- Manage companies
- Manage staff
- View attendance & leaves
- Approve/reject leave requests
- View financial reports
- Manage projects
- Send messages to staff
- View performance metrics
- Access AI insights

### As Staff:
- View personal dashboard
- Clock in/out (attendance)
- Apply for leave
- View assigned projects
- Create invoices
- Send messages to admin
- View performance goals

---

## 🆘 Need Help?

If you're having issues:
1. Check `QUICK_DATABASE_SETUP.md` for database setup
2. Check `SETUP_SUPABASE.md` for Supabase configuration
3. Verify `.env` file has correct credentials
4. Make sure dev server is running: `npm run dev`


