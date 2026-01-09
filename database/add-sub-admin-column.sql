-- Add is_sub_admin column to users table
-- Run this in Supabase SQL Editor if the column doesn't exist

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_sub_admin BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN users.is_sub_admin IS 'Sub-admin can assign team members to projects';


