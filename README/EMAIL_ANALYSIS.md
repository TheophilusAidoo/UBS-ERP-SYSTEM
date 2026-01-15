# Email Analysis - Where Emails Are Sent in UBS ERP

## Overview
This document analyzes all email sending points in the UBS ERP codebase. The system uses a cPanel SMTP server (via `backend/email-server.js`) and the email service is accessed through `src/services/email.service.ts`.

---

## 📧 Email Service Architecture

### Core Email Service
**File**: `src/services/email.service.ts`
- **Main Service**: `EmailService` class
- **Email Server**: `backend/email-server.js` (runs on port 3001 by default)
- **Connection**: Direct API call to `http://localhost:3001/send-email` (or `VITE_EMAIL_SERVER_URL`)

### Email Server Configuration
**File**: `backend/email-server.js`
- Uses Nodemailer with cPanel SMTP
- SMTP settings from `.env` file:
  - `SMTP_HOST` (default: `mail.stockmartllc.com`)
  - `SMTP_PORT` (default: `465`)
  - `SMTP_USER` (default: `info@stockmartllc.com`)
  - `SMTP_PASSWORD`
  - `SMTP_FROM_NAME` (default: `UBS ERP System`)

---

## 📍 Email Sending Points

### 1. **Staff Welcome Email** ✅
**Location**: `src/services/staff.service.ts` (lines 695-758)
**Trigger**: When admin creates a new staff member
**Recipient**: New staff member's email
**Method**: `emailService.sendEmail()`
**When Sent**:
- After staff account is successfully created
- Includes login credentials (email and password)
- Sent in background (non-blocking)
- If email fails, staff creation still succeeds (logged as warning)

**Email Content**:
- Welcome message from company
- Login credentials (email & password)
- Security warning to change password
- Login button link
- Company branding

**Code Reference**:
```typescript
// Lines 695-758 in staff.service.ts
await emailService.sendEmail({
  to: data.email,
  subject: `Welcome to ${companyName} - Your Staff Account`,
  html: welcomeEmailHtml,
});
```

---

### 2. **Client Welcome Email** ✅
**Location**: `src/services/client.service.ts` (lines 484-571)
**Trigger**: When admin/staff creates a new client with password
**Recipient**: New client's email
**Method**: `emailService.sendEmail()`
**When Sent**:
- Only if password is provided during client creation
- Sent after client record is successfully created
- Includes login credentials
- If email fails, throws error (email is critical for clients)

**Email Content**:
- Welcome message
- Client portal access information
- Login credentials (email & password)
- Security warning
- Portal features list
- Login button link

**Code Reference**:
```typescript
// Lines 556-560 in client.service.ts
await emailService.sendEmail({
  to: data.email,
  subject: `Welcome to ${companyName} - Client Portal Access`,
  html: welcomeEmailHtml,
});
```

---

### 3. **Invoice Email to Clients** ✅
**Location**: 
- `src/services/email.service.ts` (lines 23-126) - Main service method
- `src/screens/invoices/InvoicesScreen.tsx` (lines 479-501, 657, 753) - Usage points

**Trigger**: 
- Automatically when new invoice is created
- Manually when admin/staff clicks "Send Email" button
- When sending reminder emails

**Recipient**: Client's email from invoice
**Method**: `emailService.sendInvoiceEmail()`
**Attachment**: PDF invoice (generated via `invoice-pdf.service.ts`)

**When Sent**:
1. **Auto-send on creation** (lines 479-501):
   - After invoice is successfully created
   - In background (non-blocking)
   - If email fails, invoice creation still succeeds

2. **Manual send** (lines 640-680):
   - When clicking "Send Email" button on invoice list
   - Updates invoice status to "sent"

3. **Reminder email** (lines 752-754):
   - When clicking "Send Reminder" button
   - Uses `isReminder: true` flag

**Email Content**:
- Professional HTML template with company branding
- Invoice details (items, totals, due date)
- PDF attachment (Invoice_[number].pdf)
- Signature if available
- Subject line varies:
  - Regular: "Invoice [number] - Payment Required"
  - Paid: "Receipt [number] - Payment Confirmed"
  - Reminder: "Reminder: Invoice [number] - Payment Required/Overdue"

**Code Reference**:
```typescript
// Lines 479-501 in InvoicesScreen.tsx (auto-send)
await emailService.sendInvoiceEmail({
  clientEmail: formData.clientEmail,
  clientName: formData.clientName,
  invoiceNumber: finalInvoice.invoiceNumber,
  // ... other invoice data
});
```

---

### 4. **Password Reset Email** ✅
**Location**: `src/services/auth.service.ts` (lines 576-698)
**Trigger**: When user requests password reset
**Recipient**: User's email (staff, admin, or client)
**Method**: `emailService.sendEmail()`
**When Sent**:
- After Supabase generates reset token
- Sent via cPanel (in addition to Supabase's email)
- Email sent even if user doesn't exist (security best practice)

**Email Content**:
- Password reset request notification
- Reset link (redirects to `/reset-password`)
- Security warnings (link expires in 1 hour)
- Instructions to ignore if not requested

**Code Reference**:
```typescript
// Lines 681-685 in auth.service.ts
await emailService.sendEmail({
  to: email,
  subject: 'Password Reset Request - UBS ERP',
  html: resetEmailHtml,
});
```

---

### 5. **Proposal Email** ⚠️ (Not Fully Implemented)
**Location**: 
- `src/services/email.service.ts` (lines 297-335) - Service method
- `src/screens/proposals/ProposalsScreen.tsx` (lines 356-364) - Usage

**Trigger**: When admin/staff clicks "Send Email" on proposal
**Recipient**: Client's email
**Method**: `emailService.sendProposalEmail()`
**Status**: **TODO** - Currently only logs, doesn't actually send
**Note**: Service method has comment `// TODO: Integrate with actual email service`

**Code Reference**:
```typescript
// Lines 318-327 in email.service.ts
// TODO: Integrate with actual email service (same as sendInvoiceEmail)
console.log('📧 Proposal email would be sent:', {
  to: emailData.to,
  subject: emailData.subject,
});
```

---

### 6. **Report Email** ⚠️ (Not Fully Implemented)
**Location**: `src/services/email.service.ts` (lines 337-370)
**Trigger**: When exporting/sending reports
**Recipient**: Recipient email (specified in report data)
**Method**: `emailService.sendReportEmail()`
**Status**: **TODO** - Currently only logs, doesn't actually send
**Note**: Service method has comment `// TODO: Integrate with actual email service`

---

### 7. **Order Cancellation Email** ✅
**Location**: `src/services/email.service.ts` (lines 194-295)
**Trigger**: When order/product is cancelled
**Recipient**: Client's email
**Method**: `emailService.sendCancellationEmail()`
**When Sent**: From ProductsScreen when cancelling orders

**Email Content**:
- Order cancellation notice
- Cancelled product details
- Total amount
- Cancellation reason (if provided)

---

## 🚫 Missing Email Functionality

### Leave Approval/Rejection Emails ❌
**Expected Location**: `src/services/leave.service.ts` (in `updateLeaveRequest` method)
**Status**: **NOT IMPLEMENTED**
**What Should Happen**:
- When admin approves leave request → send email to staff
- When admin rejects leave request → send email to staff
- Email should include:
  - Leave type and dates
  - Approval/rejection status
  - Approver name
  - Reason (if rejection)

**Current Behavior**: 
- Leave approval/rejection only updates database
- No email notification sent to staff member

**Recommendation**: Add email sending in `leave.service.ts` → `updateLeaveRequest()` method (around line 77-123)

---

## 📊 Email Summary Table

| Email Type | To | Trigger | Status | File Location |
|------------|-----|---------|--------|---------------|
| Staff Welcome | New Staff | Staff Creation | ✅ Working | `staff.service.ts:748` |
| Client Welcome | New Client | Client Creation | ✅ Working | `client.service.ts:556` |
| Invoice Email | Client | Invoice Created/Sent | ✅ Working | `InvoicesScreen.tsx:479` |
| Invoice Reminder | Client | Manual Reminder | ✅ Working | `InvoicesScreen.tsx:753` |
| Password Reset | User | Reset Requested | ✅ Working | `auth.service.ts:681` |
| Order Cancellation | Client | Order Cancelled | ✅ Working | `email.service.ts:196` |
| Proposal Email | Client | Proposal Sent | ⚠️ TODO | `email.service.ts:297` |
| Report Email | Recipient | Report Sent | ⚠️ TODO | `email.service.ts:337` |
| Leave Approval | Staff | Leave Approved | ❌ Missing | `leave.service.ts:77` |
| Leave Rejection | Staff | Leave Rejected | ❌ Missing | `leave.service.ts:77` |

---

## 🔧 Implementation Details

### Email Service Methods

1. **`sendEmail()`** - Simple email (no attachments)
   - Used for: Welcome emails, password reset
   - File: `email.service.ts:131-138`

2. **`sendInvoiceEmail()`** - Invoice with PDF attachment
   - Used for: Invoice emails
   - File: `email.service.ts:23-126`
   - Generates PDF via `invoice-pdf.service.ts`

3. **`sendEmailWithAttachment()`** - Private method
   - Core method that connects to email server
   - File: `email.service.ts:144-190`

4. **`sendProposalEmail()`** - Proposal email (not implemented)
   - File: `email.service.ts:297-335`

5. **`sendReportEmail()`** - Report email (not implemented)
   - File: `email.service.ts:337-370`

6. **`sendCancellationEmail()`** - Order cancellation
   - File: `email.service.ts:194-295`

---

## 🎯 Key Findings

### ✅ Working Emails
1. **Staff Welcome** - Fully functional, sent automatically
2. **Client Welcome** - Fully functional, sent automatically
3. **Invoice Emails** - Fully functional with PDF attachments
4. **Password Reset** - Working (sent alongside Supabase email)
5. **Order Cancellation** - Working

### ⚠️ Partially Implemented
1. **Proposal Emails** - Service method exists but doesn't actually send (TODO)
2. **Report Emails** - Service method exists but doesn't actually send (TODO)

### ❌ Missing Critical Functionality
1. **Leave Approval Emails** - **SHOULD BE IMPLEMENTED**
   - Staff members don't get notified when leave is approved/rejected
   - Should send email in `leave.service.ts` → `updateLeaveRequest()` method

---

## 💡 Recommendations

### Priority 1: Implement Leave Notifications
Add email sending to `src/services/leave.service.ts` in the `updateLeaveRequest` method:

```typescript
// After line 106 (after updating leave balance)
if (data.status === 'approved' || data.status === 'rejected') {
  try {
    const staffEmail = userData?.email;
    if (staffEmail) {
      const emailHtml = generateLeaveStatusEmail({
        staffName: userData.first_name + ' ' + userData.last_name,
        leaveType: leaveRequest.type,
        startDate: leaveRequest.start_date,
        endDate: leaveRequest.end_date,
        status: data.status,
        approverName: approver?.first_name + ' ' + approver?.last_name,
      });
      
      await emailService.sendEmail({
        to: staffEmail,
        subject: `Leave Request ${data.status === 'approved' ? 'Approved' : 'Rejected'}`,
        html: emailHtml,
      });
    }
  } catch (emailError) {
    console.warn('Failed to send leave notification email:', emailError);
    // Don't fail the approval if email fails
  }
}
```

### Priority 2: Complete Proposal Emails
Remove TODO and implement actual email sending in `email.service.ts` → `sendProposalEmail()`

### Priority 3: Complete Report Emails
Remove TODO and implement actual email sending in `email.service.ts` → `sendReportEmail()`

---

## 📝 Notes

- All emails use cPanel SMTP server (no third-party services)
- Email server must be running on `http://localhost:3001` (or `VITE_EMAIL_SERVER_URL`)
- If email server is down, some operations may fail or show warnings
- Most email failures are non-blocking (logged but don't fail the operation)
- Client welcome email is an exception - it throws error if email fails
