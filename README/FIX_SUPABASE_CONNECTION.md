# Fix Supabase Connection

## ✅ What I Fixed

I've updated the Supabase connection to automatically use fallback credentials if the `.env` file is missing. The app will now connect to Supabase even without a `.env` file.

## 🔧 To Create .env File (Recommended)

For better security and to avoid warnings, create a `.env` file in your project root:

### Option 1: Copy from Template
```bash
cp env-template.txt .env
```

### Option 2: Manual Creation
Create a file named `.env` in the project root with:

```
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo
VITE_OPENAI_API_KEY=
VITE_APP_URL=https://ubscrm.com
```

### Option 3: Use Setup Script
```bash
bash setup-env.sh
```

## 🚀 After Creating .env

1. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Check browser console** - You should see:
   - ✅ "Supabase connection successful" (if connected)
   - ⚠️ Warning messages (if using fallback)

## ✅ Verification

The app should now be connected to Supabase! Check:

1. **Browser Console** - Look for connection status
2. **Login Screen** - Should work without errors
3. **Network Tab** - Should see requests to `*.supabase.co`

## 🔍 Troubleshooting

If you still see connection issues:

1. **Check browser console** for error messages
2. **Verify Supabase project** is active at https://supabase.com
3. **Check network tab** for failed requests
4. **Restart dev server** after creating `.env`

The connection should work now! 🎉
