# ⚡ Quick EmailJS Setup (5 minutes)

## ⚠️ IMPORTANT: These are NOT SQL commands!

**Do NOT run these in the SQL editor!** These are environment variables that go in your `.env` file.

## Step 1: Run the Setup Script

```bash
./setup-emailjs.sh
```

This will automatically add the EmailJS variables to your `.env` file.

## Step 2: Get Your EmailJS Credentials

1. **Sign up at https://www.emailjs.com/** (free account - 200 emails/month)

2. **Create Email Service:**
   - Go to **Email Services** → **Add New Service**
   - Choose **Gmail** (easiest for testing)
   - Connect your Gmail account
   - **Copy the Service ID** (looks like: `service_xxxxx`)

3. **Create Email Template:**
   - Go to **Email Templates** → **Create New Template**
   - Use this simple template:
   
   **Subject:** `Invoice {{invoice_number}} - Payment Required`
   
   **Content:**
   ```
   Dear {{client_name}},
   
   Please find your invoice attached.
   
   Invoice Number: {{invoice_number}}
   Total: {{total}}
   Due Date: {{due_date}}
   
   Thank you!
   ```
   
   - **Copy the Template ID** (looks like: `template_xxxxx`)

4. **Get Public Key:**
   - Go to **Account** → **General**
   - Find **Public Key**
   - **Copy the Public Key**

## Step 3: Update .env File

Open your `.env` file and replace the placeholder values:

```env
VITE_EMAILJS_SERVICE_ID=service_xxxxxxxxx    ← Replace with YOUR Service ID
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxxxx  ← Replace with YOUR Template ID
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxx        ← Replace with YOUR Public Key
```

**Example:**
```env
VITE_EMAILJS_SERVICE_ID=service_gmail123
VITE_EMAILJS_TEMPLATE_ID=template_abc456
VITE_EMAILJS_PUBLIC_KEY=abcdefghijklmnop123456
```

## Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Step 5: Test It!

1. Create a new invoice in the app
2. Add signature (optional)
3. Click "Create Invoice"
4. Check your email! 📧

## ✅ Done!

Your invoices will now be sent via email with PDF attachments!

## Need Help?

- See `EMAILJS_SETUP.md` for detailed instructions
- Check browser console for errors
- Verify all 3 variables are set correctly in `.env`

