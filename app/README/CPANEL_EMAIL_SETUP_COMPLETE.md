# ✅ cPanel Email System - Complete Setup

## What's Been Changed

### 1. **Staff Registration** ✅
- When admin creates a new staff member, a welcome email is sent via **cPanel SMTP**
- Email includes:
  - Welcome message
  - Login credentials (email and password)
  - Login link
  - Security reminder to change password

### 2. **Password Reset** ✅
- When user requests password reset, email is sent via **cPanel SMTP**
- Email includes:
  - Password reset link
  - Security warnings
  - Instructions

### 3. **All Other Emails** ✅
- Invoice emails → cPanel SMTP
- Test emails → cPanel SMTP
- Reports → cPanel SMTP

## ⚠️ Important: Disable Supabase Email Confirmation

To prevent duplicate emails, disable email confirmation in Supabase:

1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Navigate to: **Authentication** → **Settings** → **Email Auth**
3. **DISABLE** "Enable email confirmations"
4. **ENABLE** "Secure email change" (optional)
5. Click **Save**

This ensures:
- Staff registration emails come ONLY from cPanel
- Password reset emails come ONLY from cPanel
- No duplicate emails from Supabase

## 📧 Email Server Status

Your email server should be running on: `http://localhost:3001`

To start it:
```bash
cd backend
npm start
```

## ✅ Testing

1. **Test Staff Registration:**
   - Admin → Staff Management → Add New Staff
   - Fill in details and create
   - Check new staff email for welcome message (from cPanel)

2. **Test Password Reset:**
   - Login screen → "Forgot Password?"
   - Enter email
   - Check email for reset link (from cPanel)

3. **Test Invoice Email:**
   - Create invoice → Send to client
   - Email comes from cPanel SMTP

## 🎉 All Done!

All emails now use your cPanel SMTP server (`info@stockmartllc.com`) instead of Supabase emails!

