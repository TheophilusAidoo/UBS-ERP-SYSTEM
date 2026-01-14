-- Add salary columns to users table if they don't exist
-- Run this in Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'salary_amount'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_amount DECIMAL(12,2);
    RAISE NOTICE 'Added salary_amount column to users table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'salary_date'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_date INTEGER;
    RAISE NOTICE 'Added salary_date column to users table';
  END IF;
END $$;
