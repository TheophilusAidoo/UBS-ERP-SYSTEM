# Changes Summary - Production Deployment

This document lists all changes made for production deployment. Copy these changes to your live system.

## 📋 Files Modified

### 1. Invoice PDF Service - Fixed "From" Section & Added VAT Description
**File:** `src/services/invoice-pdf.service.ts`

#### Change 1: Fixed "From" Section Formatting (Lines ~318-350)
**OLD CODE:**
```typescript
doc.setFont('helvetica', 'normal');
if (data.companyAddress) {
  doc.text(data.companyAddress, rightColumnX, fromContentY);
  fromContentY += 5;
}
if (data.companyEmail) {
  doc.text(data.companyEmail, rightColumnX, fromContentY);
}
```

**NEW CODE:**
```typescript
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);

// Address with label
if (data.companyAddress) {
  doc.text(`Address: ${data.companyAddress}`, rightColumnX, fromContentY);
  fromContentY += 5;
}

// Phone with label
if (data.companyPhone) {
  doc.text(`Phone: ${data.companyPhone}`, rightColumnX, fromContentY);
  fromContentY += 5;
}

// Email with label
if (data.companyEmail) {
  doc.text(`Email: ${data.companyEmail}`, rightColumnX, fromContentY);
  fromContentY += 5;
}

// Website with label
if (data.companyWebsite) {
  doc.text(`Website: ${data.companyWebsite}`, rightColumnX, fromContentY);
  fromContentY += 5;
}

// Tax ID/VAT with label
if (data.companyTaxId) {
  doc.text(`VAT/Tax ID: ${data.companyTaxId}`, rightColumnX, fromContentY);
  fromContentY += 5;
}
```

#### Change 2: Added VAT Description in Tax Section (Lines ~493-510)
**OLD CODE:**
```typescript
// Tax row (if tax exists)
if (data.tax && data.tax > 0) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.black);
  // Tax label aligned to right edge of Price column
  doc.text('Tax:', separatorX.price - 10, yPosition, { align: 'right' });
  const taxText = formatCurrency(data.tax);
  doc.setFont('helvetica', 'normal');
  // Tax amount aligned to right edge
  doc.text(taxText, pageWidth - margin - 8, yPosition, { align: 'right' });
  yPosition += 8;
}
```

**NEW CODE:**
```typescript
// Tax row (if tax exists)
if (data.tax && data.tax > 0) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.black);
  // Tax label aligned to right edge of Price column
  doc.text('Tax:', separatorX.price - 10, yPosition, { align: 'right' });
  const taxText = formatCurrency(data.tax);
  doc.setFont('helvetica', 'normal');
  // Tax amount aligned to right edge
  doc.text(taxText, pageWidth - margin - 8, yPosition, { align: 'right' });
  yPosition += 5;
  
  // VAT Description (if tax ID exists)
  if (data.companyTaxId) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...colors.gray);
    const vatDescription = `VAT Registration: ${data.companyTaxId}`;
    // Right align VAT description
    doc.text(vatDescription, pageWidth - margin - 8, yPosition, { align: 'right' });
    yPosition += 6;
  } else {
    yPosition += 3;
  }
}
```

---

### 2. Staff Service - Fixed Email URL
**File:** `src/services/staff.service.ts`

#### Change: Use Production URL for Email Links (Line ~815)
**OLD CODE:**
```typescript
const loginUrl = window.location.origin + '/login';
```

**NEW CODE:**
```typescript
// Use environment variable for production URL, fallback to current origin for development
const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
const loginUrl = `${appUrl}/login`;
```

---

### 3. Client Service - Fixed Email URL
**File:** `src/services/client.service.ts`

#### Change: Use Production URL for Email Links (Line ~491)
**OLD CODE:**
```typescript
const loginUrl = window.location.origin + '/login';
```

**NEW CODE:**
```typescript
// Use environment variable for production URL, fallback to current origin for development
const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
const loginUrl = `${appUrl}/login`;
```

---

### 4. Auth Service - Fixed Password Reset URL
**File:** `src/services/auth.service.ts`

#### Change: Use Production URL for Password Reset (Lines ~595-596)
**OLD CODE:**
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

**NEW CODE:**
```typescript
// Get app URL for reset password links (use environment variable in production)
const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// ... later in code ...
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${appUrl}/reset-password`,
});

// ... and in email template ...
const resetUrl = `${appUrl}/reset-password`;
```

**Note:** Replace ALL instances of `window.location.origin` in the `resetPassword` function with `appUrl`.

---

### 5. Company Types - Added Website and Tax ID
**File:** `src/types/index.ts`

#### Change: Added Fields to Company Interface (Lines ~32-33)
**OLD CODE:**
```typescript
export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**NEW CODE:**
```typescript
export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  taxId?: string; // VAT/Tax Identification Number
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### 6. Company Service - Added Website and Tax ID Support
**File:** `src/services/company.service.ts`

#### Change 1: Updated Interfaces (Lines ~4-25)
**OLD CODE:**
```typescript
export interface CreateCompanyData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  isActive?: boolean;
}

export interface UpdateCompanyData {
  id: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  isActive?: boolean;
}
```

**NEW CODE:**
```typescript
export interface CreateCompanyData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  taxId?: string;
  isActive?: boolean;
}

export interface UpdateCompanyData {
  id: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  taxId?: string;
  isActive?: boolean;
}
```

#### Change 2: Updated createCompany Method (Line ~94-101)
**OLD CODE:**
```typescript
.insert({
  name: data.name,
  address: data.address,
  phone: data.phone,
  email: data.email,
  logo: data.logo,
  is_active: data.isActive !== undefined ? data.isActive : true,
})
```

**NEW CODE:**
```typescript
.insert({
  name: data.name,
  address: data.address,
  phone: data.phone,
  email: data.email,
  logo: data.logo,
  website: data.website,
  tax_id: data.taxId,
  is_active: data.isActive !== undefined ? data.isActive : true,
})
```

#### Change 3: Updated updateCompany Method (Line ~121-130)
**OLD CODE:**
```typescript
const updateData: any = {};
if (data.name !== undefined) updateData.name = data.name;
if (data.address !== undefined) updateData.address = data.address;
if (data.phone !== undefined) updateData.phone = data.phone;
if (data.email !== undefined) updateData.email = data.email;
if (data.logo !== undefined) {
  updateData.logo = data.logo && data.logo.trim() !== '' ? data.logo : null;
}
if (data.isActive !== undefined) updateData.is_active = data.isActive;
```

**NEW CODE:**
```typescript
const updateData: any = {};
if (data.name !== undefined) updateData.name = data.name;
if (data.address !== undefined) updateData.address = data.address;
if (data.phone !== undefined) updateData.phone = data.phone;
if (data.email !== undefined) updateData.email = data.email;
if (data.logo !== undefined) {
  updateData.logo = data.logo && data.logo.trim() !== '' ? data.logo : null;
}
if (data.website !== undefined) updateData.website = data.website;
if (data.taxId !== undefined) updateData.tax_id = data.taxId;
if (data.isActive !== undefined) updateData.is_active = data.isActive;
```

#### Change 4: Updated Mapping Functions (All return statements)
**OLD CODE:**
```typescript
return {
  id: company.id,
  name: company.name,
  address: company.address,
  phone: company.phone,
  email: company.email,
  logo: company.logo,
  isActive: company.is_active,
  createdAt: company.created_at,
  updatedAt: company.updated_at,
};
```

**NEW CODE:**
```typescript
return {
  id: company.id,
  name: company.name,
  address: company.address,
  phone: company.phone,
  email: company.email,
  logo: company.logo,
  website: company.website,
  taxId: company.tax_id || company.taxId,
  isActive: company.is_active,
  createdAt: company.created_at,
  updatedAt: company.updated_at,
};
```

**Note:** Apply this change to:
- `createCompany` method (line ~107-117)
- `updateCompany` method (line ~142-152)
- `getCompany` method (line ~170-180)
- `getAllCompanies` method (line ~191-201)

---

### 7. Invoice Screen - Pass Website and Tax ID
**File:** `src/screens/invoices/InvoicesScreen.tsx`

#### Change: Add website and taxId to all invoice email calls
Find all instances where you pass company data to `sendInvoiceEmail` and add:
```typescript
companyWebsite: selectedCompany?.website,
companyTaxId: selectedCompany?.taxId,
```

**Locations to update:**
1. Around line ~490-495 (when creating new invoice)
2. Around line ~676-678 (when sending existing invoice)
3. Around line ~770-771 (when resending invoice)
4. Around line ~870-871 (when downloading invoice PDF)

**Example:**
```typescript
companyLogo: selectedCompany?.logo,
companyName: selectedCompany?.name,
companyAddress: selectedCompany?.address,
companyPhone: selectedCompany?.phone,
companyEmail: selectedCompany?.email,
companyWebsite: selectedCompany?.website,  // ADD THIS
companyTaxId: selectedCompany?.taxId,      // ADD THIS
```

---

### 8. Environment Configuration
**File:** `.env` or `env-template.txt`

#### Add Production URL
Add this line to your `.env` file:
```env
VITE_APP_URL=https://ubscrm.com
```

**Complete .env example:**
```env
VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_OPENAI_API_KEY=

# App URL (for email links in registration/welcome emails)
VITE_APP_URL=https://ubscrm.com

# EmailJS Configuration (if using)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

---

## 🗄️ Database Changes (Optional)

If you want to store website and tax ID in the database, run this SQL:

```sql
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100);
```

**Note:** The code will work without these columns (they'll just be undefined), but adding them allows you to store and retrieve this data.

---

## ✅ Checklist for Deployment

- [ ] Copy all code changes to production files
- [ ] Add `VITE_APP_URL=https://ubscrm.com` to production `.env` file
- [ ] Run database migration (if adding website/tax_id columns)
- [ ] Rebuild the application: `npm run build`
- [ ] Test email links in registration emails
- [ ] Test invoice PDF generation with "From" section
- [ ] Verify VAT description appears on invoices with tax

---

## 📝 Notes

1. **Environment Variable:** The `VITE_APP_URL` is used for all email links. If not set, it falls back to the current origin (works for development).

2. **Database Columns:** The website and tax_id columns are optional. The code handles their absence gracefully.

3. **Invoice PDF:** The "From" section now shows properly labeled fields, and VAT description appears when tax ID is available.

4. **Email Links:** All registration, welcome, and password reset emails now use the production URL when `VITE_APP_URL` is set.

---

**Last Updated:** Today
**Production URL:** https://ubscrm.com
