# Global Settings Database Setup

## Overview
Global settings (sidebar logo, theme, currency, etc.) are now stored in Supabase instead of localStorage. This allows admin changes to sync across all devices and users immediately.

## Database Setup

### Step 1: Run the SQL Script
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `database/create-global-settings-table.sql`
6. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 2: Verify the Table
After running the script, verify:
- ✅ Table `global_settings` exists
- ✅ Default settings are inserted
- ✅ RLS policies are enabled
- ✅ Indexes are created

### Step 3: Test
1. Login as admin
2. Go to Settings
3. Change sidebar logo, theme, or currency
4. Login as staff in another browser/device
5. Staff should see the admin's changes within 3 seconds

## How It Works

### Storage
- All global settings are stored in the `global_settings` table in Supabase
- Settings are key-value pairs (e.g., `currency` = `USD`, `sidebar_logo` = `base64...`)

### Access Control
- **Everyone** (admin and staff) can **read** global settings
- **Only admins** can **update** global settings
- This is enforced by Row Level Security (RLS) policies

### Auto-Sync
- Settings are loaded on app start
- Settings are reloaded every 3 seconds to catch admin changes
- Staff will see admin changes automatically without refresh

## Settings Keys

The following settings are stored:
- `currency` - Currency code (USD, EUR, etc.)
- `currency_symbol` - Currency symbol ($, €, etc.)
- `default_annual_leave` - Default annual leave days
- `default_sick_leave` - Default sick leave days
- `default_emergency_leave` - Default emergency leave days
- `login_background_color` - Login page background color
- `login_background_image` - Login page background image (base64)
- `login_logo` - Login page logo (base64)
- `sidebar_color` - Sidebar background color
- `sidebar_logo` - Sidebar logo (base64)
- `theme_mode` - Theme mode (light/dark)
- `primary_color` - Primary color (blue, purple, etc.)

## Troubleshooting

### Settings not syncing?
1. Check that the `global_settings` table exists
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Ensure admin is logged in when making changes

### Settings not loading?
1. Check Supabase connection
2. Verify environment variables are set
3. Check browser console for errors
4. Try refreshing the page

### Permission errors?
1. Verify the user has admin role in the `users` table
2. Check RLS policies are correctly configured
3. Ensure the user is authenticated


