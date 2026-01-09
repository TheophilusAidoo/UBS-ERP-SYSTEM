# Invoice Email Setup Guide

## Overview
The invoice system now sends invoices to clients via email with PDF attachments. The PDF includes the company logo and e-signature (if provided).

## Features
- ✅ PDF invoice generation with company logo
- ✅ E-signature support in PDF
- ✅ Email sending with PDF attachment
- ✅ Automatic invoice status update to "sent"

## Installation

### Step 1: Install Required Packages
```bash
npm install jspdf @emailjs/browser
```

### Step 2: Choose Email Service

You have two options for sending emails:

#### Option A: Supabase Edge Functions (Recommended)
1. Create a Supabase Edge Function at `supabase/functions/send-email/index.ts`
2. Configure email service (SendGrid, AWS SES, Resend, etc.) in the Edge Function
3. The function will be automatically called when sending invoices

#### Option B: EmailJS (Client-side, Easy Setup)
1. Sign up at https://www.emailjs.com/
2. Create a service (Gmail, Outlook, etc.)
3. Create an email template
4. Add environment variables to `.env`:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

## EmailJS Template Setup

If using EmailJS, create a template with these variables:
- `{{to_email}}` - Client email address
- `{{subject}}` - Email subject
- `{{message}}` - HTML email content
- `{{attachment_name}}` - PDF filename
- `{{attachment_content}}` - Base64 PDF content

**Note:** EmailJS has limitations with large attachments. For production, use Supabase Edge Functions.

## Supabase Edge Function Example

Create `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://esm.sh/resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

serve(async (req) => {
  try {
    const { to, subject, html, attachments } = await req.json()

    const emailData: any = {
      from: "noreply@yourdomain.com",
      to,
      subject,
      html,
    }

    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map((att: any) => ({
        filename: att.filename,
        content: Buffer.from(att.content, "base64"),
      }))
    }

    const data = await resend.emails.send(emailData)

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

## How It Works

1. **Staff creates/sends invoice** → Invoice data is collected
2. **PDF generation** → Invoice PDF is generated with:
   - Company logo (from company settings)
   - Invoice details (number, date, due date)
   - Client information
   - Invoice items table
   - Totals (subtotal, tax, total)
   - E-signature (if provided)
3. **Email sending** → Email is sent with:
   - HTML email body
   - PDF attachment
4. **Status update** → Invoice status is updated to "sent"

## PDF Features

- **Company Logo**: Automatically included if company has a logo
- **Professional Layout**: Clean, professional invoice design
- **E-Signature**: Digital signature included if provided
- **Multi-page Support**: Automatically handles long invoices
- **Currency Formatting**: Proper currency formatting based on settings

## Troubleshooting

### PDF not generating?
- Check browser console for errors
- Ensure `jspdf` is installed: `npm install jspdf`
- Verify company logo is a valid image (base64 or URL)

### Email not sending?
- Check email service configuration
- Verify environment variables are set
- Check browser console for errors
- For EmailJS: Verify service ID, template ID, and public key

### Company logo not showing in PDF?
- Ensure company logo is uploaded in company settings
- Logo should be base64 or accessible URL
- Check logo format (PNG/JPEG supported)

### Signature not appearing?
- Verify signature is captured correctly
- Check signature is base64 data URL
- Ensure signature is provided when sending invoice

## Testing

1. Create a test invoice
2. Add company logo in company settings
3. Optionally add e-signature
4. Click "Send Invoice"
5. Check email inbox (or check console for EmailJS logs)
6. Verify PDF attachment is included

## Production Recommendations

1. **Use Supabase Edge Functions** for reliable email delivery
2. **Use a professional email service** (Resend, SendGrid, AWS SES)
3. **Set up email templates** for consistent branding
4. **Monitor email delivery** and handle failures gracefully
5. **Store email logs** in database for audit trail


