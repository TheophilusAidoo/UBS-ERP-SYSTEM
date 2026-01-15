-- Add is_banned column to users table
-- This allows admins to ban staff members from accessing the system

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Add comment to column
COMMENT ON COLUMN users.is_banned IS 'Whether the user is banned from accessing the system';

-- Create index for better query performance when filtering banned users
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true;
