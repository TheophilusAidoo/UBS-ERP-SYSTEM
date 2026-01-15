# EmailJS Setup Guide for Invoice Emails

## ⚠️ Important: These are ENVIRONMENT VARIABLES, NOT SQL commands!

Do NOT run these in the SQL editor. These go in your `.env` file.

## Quick Setup Steps

### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up for a free account (free tier allows 200 emails/month)
3. Verify your email address

### Step 2: Create Email Service
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider:
   - **Gmail** (recommended for testing)
   - **Outlook**
   - **Custom SMTP**
4. Follow the setup wizard to connect your email account
5. **Copy the Service ID** (you'll need this)

### Step 3: Create Email Template
1. Go to **Email Templates** in EmailJS dashboard
2. Click **Create New Template**
3. Use this template structure:

**Template Name:** Invoice Email

**Subject:**
```
Invoice {{invoice_number}} - Payment Required
```

**Content (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .invoice-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice {{invoice_number}}</h1>
    </div>
    <div class="content">
      <p>Dear {{client_name}},</p>
      <p>Please find your invoice attached. Payment details are below:</p>
      
      <div class="invoice-details">
        <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
        <p><strong>Total Amount:</strong> {{total}}</p>
        <p><strong>Due Date:</strong> {{due_date}}</p>
      </div>
      
      <p>Thank you for your business!</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
```

4. **Template Variables to Add:**
   - `to_email` (from EmailJS - automatically added)
   - `subject` (from EmailJS - automatically added)
   - `message` (from EmailJS - automatically added)
   - `invoice_number` (custom)
   - `client_name` (custom)
   - `total` (custom)
   - `due_date` (custom)
   - `attachment_name` (for PDF)
   - `attachment_content` (for PDF - base64)

5. **Copy the Template ID** (you'll need this)

### Step 4: Get Public Key
1. Go to **Account** → **General** in EmailJS dashboard
2. Find **Public Key** section
3. **Copy the Public Key** (you'll need this)

### Step 5: Add to .env File

1. Open your `.env` file in the project root
2. Add these lines (replace with YOUR actual values):

```env
VITE_EMAILJS_SERVICE_ID=service_xxxxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxx
```

**Example:**
```env
VITE_EMAILJS_SERVICE_ID=service_gmail123
VITE_EMAILJS_TEMPLATE_ID=template_abc456
VITE_EMAILJS_PUBLIC_KEY=abcdefghijklmnopqrstuvwxyz123456
```

### Step 6: Restart Your Dev Server

After adding the environment variables:

```bash
# Stop your current server (Ctrl+C)
npm run dev
```

### Step 7: Test It!

1. Create a new invoice in the app
2. Add a signature (optional)
3. Click "Create Invoice"
4. Check your email inbox (or the client's email)
5. You should receive the email with PDF attachment!

## Troubleshooting

### Email not sending?
- ✅ Check that all 3 environment variables are set correctly
- ✅ Restart your dev server after adding variables
- ✅ Check browser console for errors
- ✅ Verify EmailJS service is active
- ✅ Check EmailJS dashboard for delivery logs

### PDF not in email?
- ✅ EmailJS free tier has attachment size limits
- ✅ For production, use Supabase Edge Functions instead
- ✅ Check EmailJS logs for attachment errors

### "Email service not configured" message?
- ✅ Make sure `.env` file exists in project root
- ✅ Make sure variable names start with `VITE_`
- ✅ Restart dev server after adding variables
- ✅ Check that values don't have extra spaces

## Alternative: Supabase Edge Function

For production use, consider setting up a Supabase Edge Function instead of EmailJS. This provides:
- ✅ Better reliability
- ✅ No attachment size limits
- ✅ Professional email delivery
- ✅ Better error handling

See `INVOICE_EMAIL_SETUP.md` for Edge Function setup.

## Free Tier Limits

EmailJS free tier includes:
- 200 emails per month
- Attachment size limits
- Basic email templates

For higher volume, upgrade to a paid plan or use Supabase Edge Functions.

