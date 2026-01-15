# 🚀 Deploy Email Function - Quick Steps

## Step 1: Deploy Edge Function

1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx/functions
2. Click on **"send-email"** function (or create it if it doesn't exist)
3. Copy **ALL** code from: `supabase/functions/send-email/index.ts`
4. Paste into the function editor
5. Click **Deploy** button
6. Wait 10-30 seconds

## Step 2: Configure Email Settings

1. Open your app
2. Go to **Settings** → **System Settings** → **Email Configuration**
3. Fill in:
   - **From Email**: Your cPanel email (e.g., `noreply@yourdomain.com`)
   - **SMTP Host**: Usually `mail.yourdomain.com` or `smtp.yourdomain.com`
   - **SMTP Port**: `587` (for TLS) or `465` (for SSL)
   - **SMTP Username**: Your full cPanel email address
   - **SMTP Password**: Your email password
   - **Connection Security**: Select TLS (587) or SSL (465)
4. Click **Save Email Settings**

## Step 3: Test Email

1. Enter your email address in **"Test Email To"** field
2. Click **Send Test Email**
3. Check your inbox!

## ✅ Done!

Your email system is now working. All invoices and emails will be sent through your cPanel SMTP.

