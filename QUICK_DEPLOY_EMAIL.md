# 🚀 Quick Deploy Email Function - EASIEST WAY

## ✅ Method 1: Deploy via Supabase Dashboard (NO CLI NEEDED!)

This is the **easiest method** - no command line required!

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Login if needed

### Step 2: Create Edge Function
1. Click **"Edge Functions"** in the left sidebar
2. Click **"Create a new function"** button
3. Name it: `send-email`
4. Click **"Create function"**

### Step 3: Add the Function Code
1. In the code editor, **DELETE** all existing code
2. **COPY** the entire contents of `supabase/functions/send-email/index.ts`
3. **PASTE** it into the editor
4. Click **"Save"**

### Step 4: Add CORS Helper File
1. Click **"Add file"** button (or the + icon)
2. Name it: `_shared/cors.ts`
3. **COPY** the contents of `supabase/functions/_shared/cors.ts`
4. **PASTE** it into the editor
5. Click **"Save"**

### Step 5: Deploy
1. Click **"Deploy"** button (top right)
2. Wait for deployment to complete (usually 10-30 seconds)
3. You'll see "Function deployed successfully" ✅

### Step 6: Configure Email Settings
1. Go back to your app (or open it)
2. Login as Admin
3. Go to **Settings** → **System Settings** tab
4. Scroll to **"Email Configuration"**
5. Fill in:
   - **Provider**: Resend
   - **Resend API Key**: `re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9`
   - **From Email**: `onboarding@resend.dev` (for testing)
   - **From Name**: `UBS ERP System`
6. Click **"Save Email Settings"**
7. Click **"Send Test Email"** to verify it works!

---

## ✅ Method 2: Using Terminal (If you prefer CLI)

### First, install Supabase CLI:
```bash
npm install -g supabase
```

If you get permission errors, try:
```bash
sudo npm install -g supabase
```

### Then run the deployment script:
```bash
cd "/Users/alphamac/Downloads/UBS ERP "
chmod +x deploy-email-function.sh
./deploy-email-function.sh
```

The script will guide you through:
1. Logging in to Supabase
2. Linking to your project
3. Deploying the function

---

## 🎯 What Happens After Deployment?

Once deployed, the Edge Function will:
- ✅ Read email settings from your database (Admin Settings)
- ✅ Send emails via Resend API
- ✅ Attach PDF invoices automatically
- ✅ Work for all invoice emails sent from the system

---

## 🔍 Verify It's Working

1. **Check function exists:**
   - Go to Supabase Dashboard → Edge Functions
   - You should see `send-email` function listed

2. **Test from Admin Settings:**
   - Settings → System Settings → Email Configuration
   - Click "Send Test Email"
   - Check your email inbox

3. **Test with real invoice:**
   - Create an invoice
   - Click "Send Invoice"
   - Check client's email inbox

---

## ⚠️ Troubleshooting

### "Function not found" error
- Make sure you deployed the function (check Supabase Dashboard)
- Verify function name is exactly `send-email`

### "Email not sending"
- Check that API key is saved in Admin Settings
- Verify "From Email" is set
- Check Edge Function logs in Supabase Dashboard

### "API key error"
- Make sure you entered: `re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9`
- Check for extra spaces or typos

---

## 📝 Files You Need

Make sure these files exist:
- ✅ `supabase/functions/send-email/index.ts` (main function)
- ✅ `supabase/functions/_shared/cors.ts` (CORS helper)

Both files are already created in your project!

---

## 🎉 That's It!

Once deployed and configured, your email system will work completely! No more 3rd party dependencies - everything runs directly from your system.


