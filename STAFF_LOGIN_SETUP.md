# Staff Login Setup Guide

## ✅ How Staff Login Works

When an admin creates a staff member:

1. **Admin creates staff** via Admin Dashboard > Staff Management
2. **System automatically:**
   - Creates the staff user in Supabase Authentication
   - Creates the staff profile in the database
   - Links the staff to their assigned company
3. **Staff can login immediately** with the credentials provided

## 🔐 Staff Login Credentials

After creating a staff member, the admin will see a success message with:
- **Email**: The email address entered
- **Password**: The password entered

The staff member can use these credentials to login at the login page.

## ⚙️ Important: Supabase Settings

For staff to login **immediately** after creation (without email confirmation):

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** > **Settings**
3. Find **"Enable email confirmations"**
4. **Turn it OFF** (for testing/production without email verification)
5. **Save**

### Why This Matters

- If email confirmation is **ON**: Staff will need to confirm their email before they can login
- If email confirmation is **OFF**: Staff can login immediately after creation

## 🧪 Testing Staff Login

### Step 1: Create a Staff Member (as Admin)

1. Login as admin
2. Go to **Staff Management**
3. Click **"Add Staff"** or **"+"** button
4. Fill in:
   - Email: `staff@test.com` (or any email)
   - Password: `test123` (or any password)
   - First Name: `John`
   - Last Name: `Doe`
   - Job Title: `Developer` (or any)
   - Company: Select a company (or leave empty)
5. Click **"Save"** or **"Create"**

### Step 2: Check Success Message

You should see a green success alert showing:
```
✅ Staff member created successfully!

They can now login immediately with:
📧 Email: staff@test.com
🔑 Password: test123
```

### Step 3: Test Staff Login

1. **Logout** from admin account (or open in incognito/private window)
2. Go to login page
3. Enter:
   - Email: `staff@test.com`
   - Password: `test123`
4. Click **"Login"**
5. Should redirect to **Staff Dashboard**

## ✅ What Staff Will See

After successful login, staff will see:
- **Staff Dashboard** with:
  - Attendance summary
  - Leave balance
  - Assigned projects
  - Recent activities
- **Sidebar menu** with staff-accessible modules:
  - Dashboard
  - Attendance
  - Leaves
  - Financial
  - Invoices
  - Proposals
  - Projects
  - Messages
  - Performance
  - AI Assistant
  - Settings

## 🔍 Troubleshooting

### Staff Can't Login After Creation

**Check 1: Email Confirmation**
- Go to Supabase Dashboard > Authentication > Settings
- Make sure "Enable email confirmations" is **OFF**
- If it was ON, you may need to confirm the email manually:
  - Go to Authentication > Users
  - Find the staff email
  - Click "..." > "Confirm Email"

**Check 2: Password**
- Verify the password is correct
- Try resetting it in Supabase Dashboard

**Check 3: User Profile**
- Go to Supabase SQL Editor
- Run:
  ```sql
  SELECT * FROM users WHERE email = 'staff@test.com';
  ```
- Should return 1 row with `role = 'staff'`

**Check 4: Auth User**
- Go to Supabase Dashboard > Authentication > Users
- Verify the staff email exists
- Check if email is confirmed (should have a checkmark)

### "User profile not found" Error

This means the user profile wasn't created in the `users` table. Run this SQL:

```sql
INSERT INTO users (id, email, role, first_name, last_name, company_id, job_title)
SELECT 
  id, 
  email,
  'staff',
  raw_user_meta_data->>'first_name',
  raw_user_meta_data->>'last_name',
  NULL, -- or set company_id if needed
  NULL  -- or set job_title if needed
FROM auth.users 
WHERE email = 'staff@test.com'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'staff',
  email = EXCLUDED.email;
```

## 📝 Notes

- Staff passwords are set by the admin during creation
- Staff can change their password later in Settings
- Staff are automatically linked to their assigned company
- Staff can only see data related to their company (if company is assigned)


