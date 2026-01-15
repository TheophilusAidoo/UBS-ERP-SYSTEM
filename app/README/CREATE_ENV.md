# ⚠️ URGENT: Create .env File

## The Error
Your app is showing: "Missing Supabase environment variables"

## Quick Fix (2 minutes)

### Option 1: Copy from Template (Easiest)
1. In your project root, you'll see a file called `env-template.txt`
2. Copy it and rename to `.env` (with the dot!)
3. Done!

### Option 2: Manual Creation
1. In your project root (`/Users/alphamac/Downloads/UBS ERP /`), create a new file named `.env`
2. Copy and paste this EXACT content:

```
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo
VITE_OPENAI_API_KEY=

# EmailJS Configuration (Optional - for sending invoices via email)
# Get these from https://www.emailjs.com/ - See EMAILJS_SETUP.md for instructions
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

3. Save the file

### Option 3: Terminal Command
Run this in your terminal (in the project directory):
```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo
VITE_OPENAI_API_KEY=
EOF
```

## After Creating .env

1. **RESTART your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Refresh your browser**

3. The error should be gone!

## Verify It Works

After restarting, check:
- No error in browser console
- Login screen loads
- Can click "Admin" button to login


