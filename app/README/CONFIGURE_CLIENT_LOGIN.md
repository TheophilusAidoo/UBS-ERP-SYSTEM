# Configure Client Login Auto-Confirmation

## Problem
When creating a client account from the invoice form, the client may not be able to log in immediately because Supabase requires email confirmation by default.

## Solution
Add the Supabase Service Role Key to your `.env` file to enable auto-confirmation of client accounts.

## Steps

### 1. Get Your Service Role Key
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find the **Service Role Key** (keep this secret!)
5. Copy the key

### 2. Add to `.env` File
Add this line to your `.env` file in the project root:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Replace `your_service_role_key_here` with your actual service role key.

### 3. Restart Your Development Server
After adding the key, restart your development server:

```bash
npm start
# or
npm run dev
```

## What This Does

With the service role key configured:
- ✅ Client accounts are **automatically confirmed** when created
- ✅ Clients can **log in immediately** with the email and password
- ✅ No email confirmation required
- ✅ Password is included in the welcome email

Without the service role key:
- ⚠️ Client accounts are created but require email confirmation
- ⚠️ Clients need to check their email and click a confirmation link
- ⚠️ Or you need to manually confirm users in Supabase Dashboard

## Security Note

The service role key has admin privileges. It should:
- ✅ Be kept secret
- ✅ Never be committed to git (already in `.gitignore`)
- ✅ Only be used for server-side operations
- ❌ Never be exposed to the frontend in production (use environment variables properly)

## Testing

After configuration:
1. Create an invoice
2. Check "Create client account"
3. Enter client email and optionally a password
4. Submit the invoice
5. The client should be able to log in immediately using:
   - **Email**: The email you entered
   - **Password**: The password you entered (or the auto-generated one from the welcome email)
