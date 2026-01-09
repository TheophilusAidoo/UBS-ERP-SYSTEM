# ✅ Verify Login Setup

## Your Admin User Profile

Based on your data, the admin user profile is correctly set up:

```json
{
  "id": "812b48ba-6bfe-44e8-815e-817154bada10",
  "email": "admin@ubs.com",
  "role": "admin",
  "first_name": "Admin",
  "last_name": "User",
  "company_name": null
}
```

✅ **Profile exists in database** - Good!

## ⚠️ Important: Verify Authentication User

For login to work, you need **BOTH**:

1. ✅ User profile in `users` table (you have this)
2. ⚠️ User in Supabase Authentication (`auth.users` table)

### Check Authentication User

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Project: `shejpknspmrlgbjhhptx`

2. **Check Authentication:**
   - Click **Authentication** → **Users**
   - Look for `admin@ubs.com`
   - **The ID must match:** `812b48ba-6bfe-44e8-815e-817154bada10`

3. **If user doesn't exist in Authentication:**
   - Click **"Add User"** → **"Create new user"**
   - Email: `admin@ubs.com`
   - Password: `test123`
   - ✅ Check **"Auto Confirm User"**
   - Click **"Create User"**

4. **If user exists but ID doesn't match:**
   - You'll need to update the `users` table to match the auth user ID
   - Or delete and recreate both to match

## 🧪 Test Login

Once both exist with matching IDs:

1. **Go to:** http://localhost:3002/login
2. **Enter credentials:**
   - Email: `admin@ubs.com`
   - Password: `test123`
3. **Click Login**

OR

4. **Click "👤 Admin" quick login button**

## ✅ Expected Result

- ✅ Should redirect to `/dashboard`
- ✅ Should see Admin Dashboard
- ✅ Should see welcome message: "Welcome, Admin"
- ✅ Should see statistics cards (companies, staff, projects, etc.)

## 🔍 Troubleshooting

### "Wrong credentials"
- Verify password is `test123` in Supabase Authentication
- Check that "Auto Confirm User" was checked
- Try resetting password in Supabase Dashboard

### "User profile not found"
- Verify the `id` in `users` table matches the `id` in `auth.users`
- Check that `database/schema.sql` was run
- Verify RLS policies allow reading user profiles

### "Email not confirmed"
- Go to Authentication → Settings
- Disable "Enable email confirmations" for testing
- Or check "Auto Confirm User" when creating user

## 📝 Next Steps After Login

Once logged in as admin, you can:
- ✅ View dashboard statistics
- ✅ Create companies
- ✅ Manage staff
- ✅ View attendance and leaves
- ✅ Manage financial data
- ✅ Create projects
- ✅ Send messages
- ✅ View performance metrics

## 🎯 Create Staff User (Optional)

If you want to test staff login:

1. **Create in Authentication:**
   - Email: `staff@ubs.com`
   - Password: `test123`
   - Auto Confirm: ✅

2. **Run in SQL Editor:**
   ```sql
   -- First create company if needed
   INSERT INTO companies (name, email, is_active)
   VALUES ('UBS Test Company', 'test@ubs.com', true)
   ON CONFLICT DO NOTHING;

   -- Then create staff profile
   INSERT INTO users (id, email, role, company_id, first_name, last_name, job_title)
   SELECT 
     id, 
     'staff@ubs.com', 
     'staff',
     (SELECT id FROM companies WHERE name = 'UBS Test Company' LIMIT 1),
     'Staff',
     'User',
     'Developer'
   FROM auth.users 
   WHERE email = 'staff@ubs.com'
   ON CONFLICT (id) DO UPDATE 
   SET role = 'staff', 
       company_id = (SELECT id FROM companies WHERE name = 'UBS Test Company' LIMIT 1),
       first_name = 'Staff', 
       last_name = 'User',
       job_title = 'Developer';
   ```


