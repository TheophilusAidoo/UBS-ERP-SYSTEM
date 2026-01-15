# 🚀 START HERE: Deploy Email Function (5 Minutes)

## ✅ EASIEST METHOD: Deploy via Supabase Dashboard

**No command line needed!** Just copy and paste.

---

### Step 1: Open Supabase Dashboard
👉 https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx

### Step 2: Create Edge Function
1. Click **"Edge Functions"** (left sidebar)
2. Click **"Create a new function"**
3. Name: `send-email`
4. Click **"Create function"**

### Step 3: Copy Function Code
1. Open file: `supabase/functions/send-email/index.ts`
2. **Select ALL** (Cmd+A / Ctrl+A)
3. **Copy** (Cmd+C / Ctrl+C)
4. Go back to Supabase Dashboard
5. **Delete** all code in the editor
6. **Paste** the code you copied
7. Click **"Save"**

### Step 4: Add CORS File
1. Click **"Add file"** or **"+"** button
2. File path: `_shared/cors.ts`
3. Open file: `supabase/functions/_shared/cors.ts`
4. **Copy ALL** contents
5. **Paste** into the new file in Supabase
6. Click **"Save"**

### Step 5: Deploy
1. Click **"Deploy"** button (top right)
2. Wait 10-30 seconds
3. See ✅ "Function deployed successfully"

---

## ⚙️ Configure Email Settings

### Step 6: Set Up in Admin Dashboard
1. Open your app: http://localhost:3000 (or your URL)
2. Login as **Admin**
3. Go to: **Settings** → **System Settings** tab
4. Scroll to: **"Email Configuration"**

### Step 7: Enter Your Settings
Fill in these exact values:

```
Provider: Resend
Resend API Key: re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9
From Email: onboarding@resend.dev
From Name: UBS ERP System
```

5. Click **"Save Email Settings"**
6. Click **"Send Test Email"** ✅

---

## 🎉 Done!

Your email system is now working! 

**Test it:**
- Create an invoice
- Click "Send Invoice"
- Check the recipient's email inbox 📧

---

## 📋 Files Ready to Copy

All files are already created in your project:
- ✅ `supabase/functions/send-email/index.ts` (192 lines)
- ✅ `supabase/functions/_shared/cors.ts` (7 lines)

Just copy and paste them into Supabase Dashboard!

---

## ⚠️ Troubleshooting

**"Function not found"**
- Make sure you deployed it (check Supabase Dashboard → Edge Functions)

**"Email not sending"**
- Check API key is saved in Admin Settings
- Verify "From Email" is set
- Check Edge Function logs in Supabase Dashboard

**"API key error"**
- Double-check you entered: `re_W2X5nCgW_699ZyQsRhKykHCWiJQod5kb9`
- No extra spaces or characters

---

## 📞 Need Help?

Check these files:
- `QUICK_DEPLOY_EMAIL.md` - Detailed guide
- `DEPLOY_EMAIL_FUNCTION.md` - CLI method
- `EMAIL_SETUP.md` - Full email setup guide


