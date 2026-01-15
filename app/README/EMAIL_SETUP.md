# Email Setup Guide - Direct Email Sending

This guide explains how to set up direct email sending from the UBS ERP system using Supabase Edge Functions. No 3rd party email services (like EmailJS) are required.

## Prerequisites

1. **Supabase CLI** installed: `npm install -g supabase`
2. **Supabase Project** with Edge Functions enabled
3. **Email Provider** (choose one):
   - **Resend** (Recommended - Free tier available): https://resend.com
   - **SendGrid** (Alternative - Free tier available): https://sendgrid.com

## Option 1: Using Resend (Recommended)

### Step 1: Create Resend Account
1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Verify your domain (optional but recommended for production)

### Step 2: Deploy Edge Function
1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-email
   ```

### Step 3: Configure Environment Variables
In your Supabase Dashboard:
1. Go to **Project Settings** > **Edge Functions** > **Secrets**
2. Add the following secrets:

   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=UBS ERP System
   ```

   **Note**: Replace `noreply@yourdomain.com` with your verified domain email or use Resend's test domain.

## Option 2: Using SendGrid

### Step 1: Create SendGrid Account
1. Sign up at https://sendgrid.com
2. Get your API key from Settings > API Keys
3. Verify your sender email or domain

### Step 2: Deploy Edge Function
Same as Option 1, Step 2.

### Step 3: Configure Environment Variables
In your Supabase Dashboard:
1. Go to **Project Settings** > **Edge Functions** > **Secrets**
2. Add the following secrets:

   ```
   EMAIL_PROVIDER=smtp
   SENDGRID_API_KEY=SG.your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=UBS ERP System
   ```

   **Note**: Replace `noreply@yourdomain.com` with your verified sender email in SendGrid.

## Testing the Setup

1. Create an invoice in the system
2. Click "Send Invoice" 
3. The invoice should be sent directly via email with PDF attachment
4. Check the recipient's inbox

## Troubleshooting

### Edge Function Not Found
- Ensure the function is deployed: `supabase functions deploy send-email`
- Check function logs: `supabase functions logs send-email`

### Email Not Sending
- Verify environment variables are set correctly in Supabase Dashboard
- Check Edge Function logs for errors
- For Resend: Verify API key is correct and domain is verified (if using custom domain)
- For SMTP: Verify credentials and port settings

### PDF Attachment Issues
- Ensure PDF is generated correctly (check browser console)
- Verify base64 encoding is correct
- Check Edge Function logs for attachment processing errors

## Production Recommendations

1. **Use Resend** for better deliverability and analytics
2. **Verify your domain** in Resend for better email reputation
3. **Set up SPF/DKIM records** for your domain
4. **Monitor email delivery** through Resend dashboard
5. **Use environment-specific email addresses** (dev/staging/production)

## Security Notes

- Never commit API keys or passwords to git
- Use Supabase Secrets for all sensitive configuration
- Rotate API keys regularly
- Use App Passwords for Gmail (not your main password)
- Enable 2FA on email accounts used for SMTP

