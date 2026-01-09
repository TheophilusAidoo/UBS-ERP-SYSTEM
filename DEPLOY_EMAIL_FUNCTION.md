# Deploy Email Function - Step by Step Guide

## 🎯 Quick Deploy (Easiest Method)

### Option 1: Using the Script (Recommended)

1. **Make the script executable:**
   ```bash
   chmod +x deploy-email-function.sh
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy-email-function.sh
   ```

The script will:
- Check if Supabase CLI is installed
- Login if needed
- Link to your project
- Deploy the function

---

## 📋 Manual Deployment Steps

### Step 1: Install Supabase CLI

If you don't have it installed:

```bash
npm install -g supabase
```

Or using Homebrew (Mac):
```bash
brew install supabase/tap/supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate. After logging in, you'll be able to deploy.

### Step 3: Link to Your Project

```bash
supabase link --project-ref shejpknspmrlgbjhhptx
```

### Step 4: Deploy the Function

```bash
supabase functions deploy send-email
```

---

## 🌐 Alternative: Deploy via Supabase Dashboard

If you prefer not to use CLI, you can deploy directly from the Supabase Dashboard:

### Method 1: Upload via Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Click on **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it: `send-email`
5. Copy the contents of `supabase/functions/send-email/index.ts`
6. Paste it into the function editor
7. Also create the CORS file:
   - Click **Add file** → Name: `_shared/cors.ts`
   - Copy contents from `supabase/functions/_shared/cors.ts`
8. Click **Deploy**

### Method 2: Use Supabase CLI (Easier)

Just run the script:
```bash
./deploy-email-function.sh
```

---

## ✅ Verify Deployment

After deployment:

1. **Check function logs:**
   ```bash
   supabase functions logs send-email
   ```

2. **Test the function:**
   - Go to Admin Settings > System Settings > Email Configuration
   - Enter your Resend API key: `re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9`
   - Set From Email: `onboarding@resend.dev` (for testing)
   - Click "Save Email Settings"
   - Click "Send Test Email"

---

## 🔧 Troubleshooting

### "Command not found: supabase"
- Install Supabase CLI: `npm install -g supabase`

### "Not logged in"
- Run: `supabase login`

### "Project not found"
- Make sure you're using the correct project ref: `shejpknspmrlgbjhhptx`
- Or link manually: `supabase link --project-ref shejpknspmrlgbjhhptx`

### "Function deployment failed"
- Check that both files exist:
  - `supabase/functions/send-email/index.ts`
  - `supabase/functions/_shared/cors.ts`
- Check function logs: `supabase functions logs send-email`

### "Email not sending"
- Verify API key is saved in Admin Settings
- Check Edge Function logs for errors
- Make sure "From Email" is set (use `onboarding@resend.dev` for testing)

---

## 📝 After Deployment

Once deployed, configure email settings:

1. **Go to Admin Dashboard** → Settings → System Settings
2. **Scroll to Email Configuration**
3. **Fill in:**
   - Provider: Resend
   - Resend API Key: `re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9`
   - From Email: `onboarding@resend.dev` (for testing, use your domain email when ready)
   - From Name: `UBS ERP System`
4. **Click "Save Email Settings"**
5. **Click "Send Test Email"** to verify

---

## 🎉 Success!

Once deployed and configured, your invoices will be sent directly via email with PDF attachments!


