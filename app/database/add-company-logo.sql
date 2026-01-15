-- Add logo column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS logo TEXT;


