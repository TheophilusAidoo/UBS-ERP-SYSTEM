# Quick Start Guide - UBS ERP

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Supabase
1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run `database/schema.sql`
4. Copy your project URL and anon key from Settings > API

### Step 3: Configure Environment
Create `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🎯 Quick Login (Easiest Way!)

1. **Start the app:**
   ```bash
   npm start
   ```

2. **On the login screen, click:**
   - **"Admin"** button for admin access
   - **"Staff"** button for staff access

3. **The app will automatically:**
   - Create the test account if it doesn't exist
   - Log you in immediately
   - Take you to the appropriate dashboard

### Test Credentials (Auto-created)
- **Admin**: `admin@ubs.com` / `test123`
- **Staff**: `staff@ubs.com` / `test123`

## 📱 What You'll See

### Admin Dashboard
- Total companies count
- Total staff count
- Active projects
- Pending leaves
- Revenue, expenses, and profit
- Access to all modules via drawer menu

### Staff Dashboard
- Attendance summary
- Leave balance
- Assigned projects
- Access to staff modules

## 🔧 Manual Registration (Alternative)

If quick login doesn't work:

1. Click **"Don't have an account? Register"**
2. Select **Admin** or **Staff** role
3. Fill in the form
4. Click **Register**

## ⚠️ Troubleshooting

### "User profile not found" error
- Make sure you ran `database/schema.sql` in Supabase
- Check that the `users` table exists

### "Invalid credentials"
- Use the Quick Login buttons instead
- Or register a new account manually

### Can't see dashboard
- Check Supabase Authentication settings
- Disable "Email confirmation required" for testing
- Verify your `.env` file has correct credentials

## 📚 Next Steps

- Explore the Admin Dashboard
- Try creating companies and staff (when implemented)
- Test the multi-language switcher
- Check out the different modules

## 🆘 Need Help?

- See [SETUP.md](./SETUP.md) for detailed setup
- See [TEST_USERS.md](./TEST_USERS.md) for user creation
- Check [PROJECT_STATUS.md](./PROJECT_STATUS.md) for what's implemented


