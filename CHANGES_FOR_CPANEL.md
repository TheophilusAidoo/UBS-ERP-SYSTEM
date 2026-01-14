# Changes Made - Files to Copy to cPanel

## Summary of Fixes

1. ✅ **Staff Welcome Email** - Staff now receive login credentials via email when created by admin
2. ✅ **Client Welcome Email** - Already working, verified
3. ✅ **VAT Display in Email** - VAT now shows prominently in invoice emails
4. ✅ **VAT Display in PDF** - VAT label updated to show "VAT" instead of "Tax"
5. ✅ **PDF Download Fix** - Added fallback mechanism for PDF downloads

---

## Files Modified

### 1. `/src/services/staff.service.ts`
**Location:** Lines 773-880
**Changes:**
- Enhanced staff welcome email sending
- Improved error handling for email delivery
- Added better logging for email success/failure
- Password displayed in code format for better visibility

**What to do:**
- Copy the entire file: `src/services/staff.service.ts`
- Upload to: `public_html/src/services/staff.service.ts` (or your cPanel structure)

---

### 2. `/src/services/email.service.ts`
**Location:** Lines 581-610
**Changes:**
- Updated VAT display in email HTML template
- Changed "Tax (VAT X%)" to "VAT (X%)" for clarity
- Made VAT row bold for better visibility
- Improved tax calculation logic

**What to do:**
- Copy the entire file: `src/services/email.service.ts`
- Upload to: `public_html/src/services/email.service.ts`

---

### 3. `/src/services/invoice-pdf.service.ts`
**Location:** Lines 526-540
**Changes:**
- Updated PDF to show "VAT" instead of "Tax"
- Made VAT label bold for better visibility
- Changed label from "Tax (X%):" to "VAT (X%):"

**What to do:**
- Copy the entire file: `src/services/invoice-pdf.service.ts`
- Upload to: `public_html/src/services/invoice-pdf.service.ts`

---

### 4. `/src/screens/invoices/InvoicesScreen.tsx`
**Location:** Lines 948-1005
**Changes:**
- Fixed PDF download with fallback mechanism
- Added base64 fallback if blob generation fails
- Improved error handling and user feedback

**What to do:**
- Copy the entire file: `src/screens/invoices/InvoicesScreen.tsx`
- Upload to: `public_html/src/screens/invoices/InvoicesScreen.tsx`

---

## Deployment Steps

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Upload files to cPanel:**
   - Upload the entire `dist` folder contents to your cPanel `public_html` directory
   - OR upload the specific source files listed above if you're using a build process on the server

3. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache completely

4. **Verify:**
   - Create a new staff member → Check email inbox
   - Create a new client → Check email inbox
   - Create an invoice → Check email for VAT display
   - Download invoice PDF → Should work without errors

---

## Key Changes Summary

### Staff Email
- ✅ Staff receive welcome email with credentials
- ✅ Email includes login link to https://ubscrm.com/login
- ✅ Password displayed clearly in code format

### Client Email
- ✅ Clients receive welcome email with credentials (already working)
- ✅ Email includes login link to https://ubscrm.com/login

### Invoice Email
- ✅ Shows Subtotal
- ✅ Shows **VAT (X%)** prominently in bold
- ✅ Shows VAT Registration if available
- ✅ Shows Total

### Invoice PDF
- ✅ Shows Subtotal
- ✅ Shows **VAT (X%)** in bold
- ✅ Shows VAT Registration if available
- ✅ Shows Total
- ✅ Download works with fallback mechanism

---

## Testing Checklist

- [ ] Create a staff member → Check email received
- [ ] Create a client → Check email received
- [ ] Create an invoice with tax → Check email shows VAT
- [ ] Download invoice PDF → Should download successfully
- [ ] Verify VAT shows in both email and PDF

---

## Notes

- All email links point to `https://ubscrm.com/login` (hardcoded)
- Email sending happens in background (non-blocking)
- PDF download has fallback to base64 if blob fails
- VAT is calculated automatically if not provided (total - subtotal)
